import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Ejecución explícita, con identidad del servidor comprobada fuera del script.
// Crea SOLO una base exclusiva; nunca borra bases ni modifica la base fuente.
const source = new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(source.hostname));
assert.equal(source.port, '5432');
assert.match(process.env.TEST_SERVER_SYSTEM_IDENTIFIER || '', /^\d+$/);
const admin = new PrismaClient();
const root = process.cwd();
const cache = path.join(root, 'node_modules/.cache/inventario');
fs.mkdirSync(cache, {recursive:true});
const name = `nes_inventario_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
assert.match(name, /^nes_inventario_test_[a-z0-9_]+$/);
const target = new URL(source);
target.pathname = `/${name}`;
target.searchParams.set('schema','public');
function migrate(url, schema) {
  const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema',schema],{
    cwd:root,env:{...process.env,DATABASE_URL:url.href},encoding:'utf8',timeout:60000,
  });
  if(result.status!==0) throw new Error(`migrate deploy falló (código ${result.status}); salida omitida para no divulgar conexiones`);
}
let testClient;
try {
  const [identity]=await admin.$queryRaw`SELECT system_identifier::text AS id, current_setting('server_version_num')::int AS version FROM pg_control_system()`;
  assert.equal(identity.id,process.env.TEST_SERVER_SYSTEM_IDENTIFIER);
  assert.ok(identity.version>=160000 && identity.version<170000);
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  fs.writeFileSync(path.join(cache,'target.json'),JSON.stringify({database:name,systemIdentifier:identity.id},null,2));
  testClient=new PrismaClient({datasources:{db:{url:target.href}}});
  migrate(target,path.join(root,'prisma/schema.prisma'));
  console.log('PASS: migraciones publicadas y nueva migración desde base vacía');

  // Reproducir una instalación con la migración inicial y Equipo creado sin
  // migración, tanto sin código como con códigos cargados parcialmente.
  const legacyRoot=path.join(cache,'legacy-prisma');
  fs.mkdirSync(path.join(legacyRoot,'migrations'),{recursive:true});
  fs.copyFileSync('prisma/schema.prisma',path.join(legacyRoot,'schema.prisma'));
  fs.cpSync('prisma/migrations/20260925000556_init',path.join(legacyRoot,'migrations/20260925000556_init'),{recursive:true});
  fs.copyFileSync('prisma/migrations/migration_lock.toml',path.join(legacyRoot,'migrations/migration_lock.toml'));
  for(const schema of ['legacy','legacy_codes']) {
    const legacyUrl=new URL(target); legacyUrl.searchParams.set('schema',schema);
    migrate(legacyUrl,path.join(legacyRoot,'schema.prisma'));
    const legacy=new PrismaClient({datasources:{db:{url:legacyUrl.href}}});
    try {
      await legacy.$executeRawUnsafe(`CREATE TABLE "Equipo" (
        "id" SERIAL PRIMARY KEY,"nombre" TEXT NOT NULL,"categoria" TEXT NOT NULL,
        "imagenUrl" TEXT,"descripcion" TEXT,"estado" TEXT DEFAULT 'Disponible',
        "precio" DOUBLE PRECISION DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      await legacy.$executeRawUnsafe(`INSERT INTO "Equipo" ("nombre","categoria","imagenUrl","descripcion","estado","precio") VALUES
        ('Guitarra antigua','Instrumentos','https://example.com/antigua.png','Conservar', 'En Uso',150),
        ('Guitarra antigua','Instrumentos',NULL,NULL,NULL,0)`);
      await legacy.$executeRawUnsafe('CREATE TABLE "LegacyLink" ("equipoId" INTEGER REFERENCES "Equipo"("id"))');
      await legacy.$executeRawUnsafe('INSERT INTO "LegacyLink" VALUES (1)');
      await legacy.$executeRawUnsafe(`INSERT INTO "CatalogoItem" ("nombre","categoria","precioVenta","costoInterno") VALUES ('Histórico','Audio',100,40)`);
      if(schema==='legacy_codes') {
        await legacy.$executeRawUnsafe('ALTER TABLE "Equipo" ADD COLUMN "codigo" TEXT');
        await legacy.$executeRawUnsafe(`UPDATE "Equipo" SET "codigo"='EXISTENTE-001' WHERE "id"=1`);
      }
      const before=await legacy.$queryRawUnsafe('SELECT "id","nombre","categoria","imagenUrl","descripcion","estado","precio","createdAt" FROM "Equipo" ORDER BY "id"');
      migrate(legacyUrl,path.join(root,'prisma/schema.prisma'));
      const after=await legacy.$queryRawUnsafe('SELECT "id","nombre","categoria","imagenUrl","descripcion","estado","precio","createdAt" FROM "Equipo" ORDER BY "id"');
      assert.deepEqual(after,before);
      const codes=await legacy.$queryRawUnsafe('SELECT "codigo" FROM "Equipo" ORDER BY "id"');
      assert.equal(new Set(codes.map(r=>r.codigo)).size,2);
      assert.ok(codes.every(r=>r.codigo?.trim()));
      if(schema==='legacy_codes') assert.equal(codes[0].codigo,'EXISTENTE-001');
      assert.deepEqual(await legacy.$queryRawUnsafe('SELECT * FROM "LegacyLink"'),[{equipoId:1}]);
      const catalog=await legacy.$queryRawUnsafe('SELECT "nombre" FROM "CatalogoItem"');
      assert.equal(catalog[0].nombre,'Histórico');
      console.log(`PASS: ${schema}, conserva ID, atributos, relaciones y catálogo; códigos únicos`);
    } finally {await legacy.$disconnect();}
  }
  console.log(`Base exclusiva conservada: ${name}`);
} catch(error) {
  console.error(`Preparación fallida: ${error.name}; ${error.code || 'revisar comprobaciones'}`);
  process.exitCode=1;
} finally {await testClient?.$disconnect();await admin.$disconnect();}
