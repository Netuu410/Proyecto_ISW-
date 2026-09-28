import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// No utiliza DATABASE_URL como fallback: las pruebas requieren destino explícito.
const conexion = process.env.AGENDA_TEST_DATABASE_URL;
if (!conexion) throw new Error('Define AGENDA_TEST_DATABASE_URL apuntando a una base local llamada nes_agenda_test');
const destino = new URL(conexion);
if (!['127.0.0.1', 'localhost'].includes(destino.hostname) || destino.pathname !== '/nes_agenda_test') {
  throw new Error('Por seguridad este script solo permite localhost/nes_agenda_test');
}
const backend = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, DATABASE_URL: conexion, AGENDA_INTEGRATION: '1' };
const ejecutar = args => {
  const resultado = spawnSync(process.execPath, args, { cwd: backend, env, stdio: 'inherit' });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status || 1);
};
ejecutar(['node_modules/prisma/build/index.js', 'generate']);
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: conexion } } });
try {
  const [real] = await db.$queryRaw`SELECT current_database() AS base, current_user AS usuario, version() AS version`;
  if (real.base !== 'nes_agenda_test') throw new Error('El servidor respondió con una base distinta a la autorizada');
  console.log(`Destino verificado: ${destino.hostname}:${destino.port || 5432}/${real.base} (${real.usuario})`);
  console.log(real.version);
} finally { await db.$disconnect(); }
ejecutar(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
ejecutar(['--test', ...readdirSync(new URL('../test/', import.meta.url))
  .filter(nombre => nombre.endsWith('.test.js')).map(nombre => `test/${nombre}`)]);
