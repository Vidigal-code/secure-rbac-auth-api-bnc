/**
 * Runner simples para carregar variáveis de ambiente de um arquivo (ex.: env.local)
 * e executar um comando, SEM sobrescrever variáveis já definidas no processo.
 *
 * Uso:
 *   node scripts/run-with-env.cjs -- <comando> [args...]
 *
 * Estratégia de arquivo:
 * - Se existir `.env`, usa `.env`
 * - Senão, se existir `env.local`, usa `env.local`
 * - Senão, não carrega arquivo (apenas executa o comando)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function pickEnvFile() {
  const cwd = process.cwd();
  const dotEnv = path.join(cwd, '.env');
  const envLocal = path.join(cwd, 'env.local');
  if (fs.existsSync(dotEnv)) return dotEnv;
  if (fs.existsSync(envLocal)) return envLocal;
  return null;
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const out = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // remove aspas simples/duplas (bem básico)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) out[key] = value;
  }

  return out;
}

function loadEnvNonOverriding(filePath) {
  const parsed = parseEnvFile(filePath);
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = String(v);
  }
}

function main() {
  const args = process.argv.slice(2);
  const sep = args.indexOf('--');
  if (sep === -1) {
    console.error('Uso: node scripts/run-with-env.cjs -- <comando> [args...]');
    process.exit(2);
  }

  const cmd = args.slice(sep + 1);
  if (!cmd.length) {
    console.error('Comando ausente. Uso: node scripts/run-with-env.cjs -- <comando> [args...]');
    process.exit(2);
  }

  const envFile = pickEnvFile();
  if (envFile) {
    loadEnvNonOverriding(envFile);
  }

  const bin = cmd[0];
  const binArgs = cmd.slice(1);
  const res = spawnSync(bin, binArgs, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  process.exit(res.status ?? 1);
}

main();


