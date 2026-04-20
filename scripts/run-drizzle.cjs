const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const drizzleBin = path.join(rootDir, 'node_modules', 'drizzle-kit', 'bin.cjs');
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [drizzleBin, ...args], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
