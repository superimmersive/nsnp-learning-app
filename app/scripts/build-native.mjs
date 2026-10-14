import { spawnSync } from 'node:child_process'

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1)
}

run('npx', ['tsc', '-b'], process.env)
run('npx', ['vite', 'build'], { ...process.env, BASE_PATH: '/', VITE_NATIVE: '1' })
