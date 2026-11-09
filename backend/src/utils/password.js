import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function crearHash(password) {
  const salt = randomBytes(16).toString('hex');
  const clave = await scrypt(password, salt, 64);
  return `${salt}:${clave.toString('hex')}`;
}

export async function verificarPassword(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string') return false;
  const partes = hash.split(':');
  if (
    partes.length !== 2 ||
    !/^[a-f0-9]{32}$/.test(partes[0]) ||
    !/^[a-f0-9]{128}$/.test(partes[1])
  ) {
    return false;
  }

  const [salt, claveGuardada] = partes;
  const clave = await scrypt(password, salt, 64);
  const claveOriginal = Buffer.from(claveGuardada, 'hex');
  return timingSafeEqual(clave, claveOriginal);
}
