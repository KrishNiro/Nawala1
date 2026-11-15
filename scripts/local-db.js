import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(project, '.postgres-data');
const log = path.join(project, 'postgres.log');
const port = '5433';
const command = process.argv[2] || 'status';

const possibleBins = [
  process.env.PG_BIN,
  'C:\\Program Files\\PostgreSQL\\18\\bin',
  'C:\\Program Files\\PostgreSQL\\17\\bin',
  'C:\\Program Files\\PostgreSQL\\16\\bin'
].filter(Boolean);
const bin = possibleBins.find((folder) => fs.existsSync(path.join(folder, 'pg_ctl.exe')));

if (!bin) {
  console.error('PostgreSQL was not found. Install PostgreSQL or set PG_BIN to its bin folder.');
  process.exit(1);
}

function run(program, args, allowFailure = false) {
  const result = spawnSync(path.join(bin, `${program}.exe`), args, { stdio: 'inherit' });
  if (!allowFailure && result.status !== 0) process.exit(result.status ?? 1);
  return result.status === 0;
}

function initialize() {
  if (fs.existsSync(path.join(data, 'PG_VERSION'))) return;
  console.log('Creating a local PostgreSQL data folder...');
  fs.mkdirSync(data, { recursive: true });
  run('initdb', ['-D', data, '--username=postgres', '--auth=trust', '--encoding=UTF8']);
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function startServer() {
  const startedWithPgCtl = run(
    'pg_ctl',
    ['-D', data, '-l', log, '-o', `-p ${port} -h 127.0.0.1`, 'start', '-w'],
    true
  );
  if (startedWithPgCtl) return;

  // Some restricted Windows environments cannot use pg_ctl. Start postgres directly.
  const logFile = fs.openSync(log, 'a');
  const server = spawn(
    path.join(bin, 'postgres.exe'),
    ['-D', data, '-p', port, '-h', '127.0.0.1'],
    { detached: true, windowsHide: true, stdio: ['ignore', logFile, logFile] }
  );
  server.unref();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    wait(250);
    if (run('pg_isready', ['-h', '127.0.0.1', '-p', port], true)) return;
  }
  console.error(`PostgreSQL did not start. Check ${log}.`);
  process.exit(1);
}

function stopServer() {
  const stoppedWithPgCtl = run('pg_ctl', ['-D', data, 'stop', '-m', 'fast', '-w'], true);
  if (stoppedWithPgCtl) return;
  const pidFile = path.join(data, 'postmaster.pid');
  if (!fs.existsSync(pidFile)) return;
  const pid = Number(fs.readFileSync(pidFile, 'utf8').split(/\r?\n/, 1)[0]);
  if (Number.isInteger(pid)) process.kill(pid, 'SIGTERM');
  for (let attempt = 0; attempt < 40; attempt += 1) {
    wait(250);
    if (!run('pg_isready', ['-h', '127.0.0.1', '-p', port], true)) return;
  }
  console.error('PostgreSQL did not stop.');
  process.exit(1);
}

function start() {
  initialize();
  const alreadyRunning = run('pg_isready', ['-h', '127.0.0.1', '-p', port], true);
  if (!alreadyRunning) {
    startServer();
  }
  const exists = spawnSync(path.join(bin, 'psql.exe'), [
    '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', 'postgres',
    '-tAc', "SELECT 1 FROM pg_database WHERE datname='nawala_simple'"
  ], { encoding: 'utf8' });
  if (exists.stdout.trim() !== '1') {
    run('createdb', ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', 'nawala_simple']);
  }
  console.log(`PostgreSQL is ready on 127.0.0.1:${port}.`);
}

if (command === 'start') start();
else if (command === 'stop') stopServer();
else if (command === 'status') run('pg_isready', ['-h', '127.0.0.1', '-p', port], true);
else {
  console.error('Use: npm run db:start, npm run db:stop, or npm run db:status');
  process.exit(1);
}
