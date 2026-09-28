import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '../../backend/node_modules/@prisma/client/default.js';

// Requiere backend apuntando a la base aislada y Edge con CDP en 127.0.0.1:9222.
const conexion = process.env.AGENDA_TEST_DATABASE_URL;
if (!conexion) throw new Error('Define AGENDA_TEST_DATABASE_URL para autorizar los datos de prueba');
const destino = new URL(conexion);
assert.ok(['127.0.0.1', 'localhost'].includes(destino.hostname));
assert.equal(destino.pathname, '/nes_agenda_test');
const db = new PrismaClient({ datasources: { db: { url: conexion } } });
const prefijo = `Demo agenda ${Date.now()}`;
let socket;
try {
  const [real] = await db.$queryRaw`SELECT current_database() AS nombre`;
  assert.equal(real.nombre, 'nes_agenda_test');
  const lugar = await db.recinto.create({ data: { nombre: `${prefijo} - Salón principal`, direccion: 'Santiago', clave: `${prefijo}-1` } });
  const lugarVisita = await db.recinto.create({ data: { nombre: `${prefijo} - Centro cultural`, direccion: 'Providencia', clave: `${prefijo}-2` } });
  const recurso = await db.equipo.create({ data: { nombre: `${prefijo} - Micrófono`, categoria: 'Audio', precio: 1000, stock: 1, estado: 'Disponible' } });
  const apiRecintos = await (await fetch('http://localhost:3000/api/agenda/recintos')).json();
  assert.ok(apiRecintos.some(item => item.id === lugar.id && item.nombre === lugar.nombre), 'El backend debe usar la misma base aislada');

  const paginas = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const pagina = paginas.find(item => item.type === 'page');
  assert.ok(pagina, 'Se requiere una página en el navegador de pruebas');
  socket = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let secuencia = 0;
  const pendientes = new Map();
  const erroresNavegador = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') erroresNavegador.push(message.params.exceptionDetails.text);
    if (message.id) {
      const pendiente = pendientes.get(message.id);
      if (!pendiente) return;
      pendientes.delete(message.id);
      if (message.error) pendiente.reject(new Error(message.error.message)); else pendiente.resolve(message.result);
    }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++secuencia; pendientes.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluar = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const esperar = async expression => {
    const limite = Date.now() + 15000;
    while (Date.now() < limite) {
      if (await evaluar(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error(`No se cumplió: ${expression}\n${await evaluar('document.body.innerText')}`);
  };
  const click = texto => evaluar(`(() => { const boton = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(texto)}); if (!boton || boton.disabled) throw new Error('Botón no disponible: ' + ${JSON.stringify(texto)}); boton.click(); })()`);
  const llenar = (etiqueta, valor) => evaluar(`(() => {
    const label = [...document.querySelectorAll('label')].find(e => e.firstChild?.textContent.trim() === ${JSON.stringify(etiqueta)});
    const input = label?.querySelector('input, select');
    if (!input) throw new Error('Campo no encontrado: ' + ${JSON.stringify(etiqueta)});
    const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, ${JSON.stringify(String(valor))});
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  })()`);
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:5173/calendario' });
  await esperar(`document.querySelector('h1')?.textContent === 'Calendario central' && [...document.querySelectorAll('button')].some(b => b.textContent === 'Agendar actividad' && !b.disabled)`);
  await click('Agendar actividad');
  await llenar('Nombre de la actividad', 'Lanzamiento de temporada');
  await llenar('Cliente', 'Productora de prueba');
  await llenar('Recinto', lugar.id);
  await llenar('Inicio en Santiago', '2030-10-16T10:00');
  await llenar('Término en Santiago', '2030-10-16T12:00');
  await evaluar(`(() => { const input = document.querySelector('input[aria-label=${JSON.stringify(`Cantidad de ${recurso.nombre}`)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '1'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click('Consultar disponibilidad');
  await esperar(`document.body.innerText.includes('Recursos disponibles.')`);
  await click('Confirmar reserva');
  await esperar(`document.body.innerText.includes('Evento: reserva confirmada (Reservado).') && !document.querySelector('#form-titulo')`);
  const misTarjetas = `[...document.querySelectorAll('.agenda-tarjeta')].filter(tarjeta => tarjeta.textContent.includes(${JSON.stringify(prefijo)}))`;
  await esperar(`${misTarjetas}.some(tarjeta => tarjeta.textContent.includes('Lanzamiento de temporada'))`);
  assert.ok(await evaluar(`document.querySelector('.agenda-detalle')?.textContent.includes('Productora de prueba')`));
  console.log('OK: formulario, preconsulta, confirmación y detalle de evento');

  await esperar(`[...document.querySelectorAll('button')].some(b => b.textContent === 'Agendar actividad' && !b.disabled)`);
  await click('Agendar actividad');
  await llenar('Tipo', 'VISITA_TECNICA');
  await llenar('Nombre de la actividad', 'Inspección técnica');
  await llenar('Cliente', 'Cliente de visita');
  await llenar('Recinto', lugar.id);
  await llenar('Inicio en Santiago', '2030-10-16T11:00');
  await llenar('Término en Santiago', '2030-10-16T12:00');
  await click('Confirmar reserva');
  await esperar(`document.querySelector('.agenda-conflictos')?.textContent.includes('ocupado durante el horario solicitado')`);
  assert.equal(await db.actividadAgenda.count({ where: { recintoId: lugar.id } }), 1);
  console.log('OK: conflicto de recinto visible; actividad rechazada no guardada');
  await llenar('Recinto', lugarVisita.id);
  await click('Confirmar reserva');
  await esperar(`document.body.innerText.includes('Visita técnica: reserva confirmada (Reservado).')`);
  await esperar(`${misTarjetas}.length === 2`);
  await llenar('Mostrar', 'VISITA_TECNICA');
  await esperar(`${misTarjetas}.length === 1 && ${misTarjetas}[0].textContent.includes('Inspección técnica')`);
  await llenar('Mostrar', '');
  await esperar(`${misTarjetas}.length === 2`);
  console.log('OK: visita simultánea con otro recinto y filtro por tipo');

  const evidencia = new URL('../../docs/', import.meta.url);
  await mkdir(evidencia, { recursive: true });
  let captura = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL('calendario-escritorio.png', evidencia), Buffer.from(captura.data, 'base64'));
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluar('document.documentElement.scrollWidth <= window.innerWidth'), 'No debe existir desplazamiento horizontal en móvil');
  captura = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL('calendario-movil.png', evidencia), Buffer.from(captura.data, 'base64'));
  assert.deepEqual(erroresNavegador, []);
  console.log('OK: escritorio y móvil sin desbordamiento; sin excepciones de JavaScript');
} finally {
  socket?.close();
  await db.$disconnect();
}
