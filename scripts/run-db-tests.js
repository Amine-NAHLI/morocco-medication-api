const { spawnSync } = require('child_process');

require('./assert-test-db');

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL,
};

const run = (args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};

run(['prisma', 'migrate', 'deploy']);
run(['jest', '--config', 'jest.db.config.js', '--runInBand']);
