#!/usr/bin/env node
// Ponto único de entrada em desenvolvimento (SDD § "Camadas e padrão
// arquitetural" → "Ponto único de entrada"): sobe apps/api, apps/admin e
// apps/lp ao mesmo tempo. O dev server de apps/lp (http://localhost:5173)
// é o endereço único; ele encaminha /admin e /api para os outros dois via
// proxy (ver apps/lp/vite.config.ts).
//
// Sem dependência nova (ex.: `concurrently`): child_process.spawn resolve
// o critério desta tarefa sem adicionar ferramental ao projeto.

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const IS_WINDOWS = process.platform === 'win32'

const DEV_PROCESSES = [
  { name: 'api', appDir: 'apps/api' },
  { name: 'admin', appDir: 'apps/admin' },
  { name: 'lp', appDir: 'apps/lp' },
]

const children = []
let shuttingDown = false

function forwardPrefixed(outputStream, processName, chunk) {
  const lines = chunk.toString().split('\n').filter((line) => line.length > 0)
  for (const line of lines) {
    outputStream.write(`[${processName}] ${line}\n`)
  }
}

function spawnDevProcess({ name, appDir }) {
  const child = spawn('npm', ['run', 'dev', '--prefix', appDir], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: IS_WINDOWS,
  })

  child.stdout.on('data', (chunk) => forwardPrefixed(process.stdout, name, chunk))
  child.stderr.on('data', (chunk) => forwardPrefixed(process.stderr, name, chunk))

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(
      `[dev] "${name}" encerrou inesperadamente (código ${code}, sinal ${signal}) — encerrando os demais processos.`,
    )
    shutdownAll(code ?? 1)
  })

  return child
}

function shutdownAll(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGTERM')
    }
  }
  process.exitCode = exitCode
}

process.on('SIGINT', () => shutdownAll(0))
process.on('SIGTERM', () => shutdownAll(0))

for (const devProcess of DEV_PROCESSES) {
  children.push(spawnDevProcess(devProcess))
}
