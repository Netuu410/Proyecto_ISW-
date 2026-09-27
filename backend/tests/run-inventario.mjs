import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

// Usa exclusivamente la base creada por prepare-inventario.mjs.
// La URL se transmite al proceso hijo, nunca se imprime ni se guarda.
const meta=JSON.parse(fs.readFileSync('node_modules/.cache/inventario/target.json','utf8'));
assert.match(meta.database,/^nes_inventario_test_[a-z0-9_]+$/);
const target=new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(target.hostname));
assert.equal(target.port,'5432');
target.pathname='/'+meta.database;
target.searchParams.set('schema','public');
const result=spawnSync(process.execPath,['--test','tests/inventario.integration.test.js'],{
  env:{...process.env,TEST_DATABASE_URL:target.href,TEST_SERVER_SYSTEM_IDENTIFIER:meta.systemIdentifier},
  stdio:'inherit',
});
process.exitCode=result.status ?? 1;
