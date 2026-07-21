const { spawnSync } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const docker = isWindows ? 'docker.exe' : 'docker';
const npm = isWindows ? 'npm.cmd' : 'npm';
const composeFile = path.join(__dirname, '..', 'docker-compose.test.yml');
const testDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5433/morocco_medication_test';
const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  TEST_DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: 'test-only-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters',
  SYNC_SCHEDULER_ENABLED: 'false',
};

const execute = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
    shell: isWindows,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
};

let exitCode = 1;
try {
  const upStatus = execute(docker, ['compose', '-f', composeFile, 'up', '-d', '--wait', '--wait-timeout', '60']);
  if (upStatus !== 0) exitCode = upStatus;
  else exitCode = execute(npm, ['run', 'test:db'], testEnv);
} catch (error) {
  console.error(`Unable to run local PostgreSQL tests: ${error.message}`);
} finally {
  try {
    const downStatus = execute(docker, ['compose', '-f', composeFile, 'down', '--volumes', '--remove-orphans']);
    if (exitCode === 0 && downStatus !== 0) exitCode = downStatus;
  } catch (error) {
    console.error(`Unable to stop local PostgreSQL test environment: ${error.message}`);
    if (exitCode === 0) exitCode = 1;
  }
}

process.exitCode = exitCode;
