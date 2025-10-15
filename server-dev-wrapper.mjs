// Simple development wrapper to auto-restart Next.js if it crashes and log exit causes
import { spawn } from 'child_process'
import net from 'net'
import fs from 'fs'
import path from 'path'

// Simple lock to avoid multiple wrapper instances competing for the same port
const lockFile = path.resolve('.next-dev.lock')
try {
  fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' })
} catch (e) {
  console.log('[dev-wrapper] Detected another running dev wrapper (lock file exists). Exiting this instance.')
  process.exit(0)
}

const cleanup = () => {
  try { fs.unlinkSync(lockFile) } catch {}
}
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(0) })
process.on('SIGTERM', () => { cleanup(); process.exit(0) })

let restartCount = 0

function checkPortFree (port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') return resolve(false)
        // Other errors: still treat as not free, but log
        console.warn('[dev-wrapper] Port check error:', err)
        resolve(false)
      })
      .once('listening', () => {
        tester.close(() => resolve(true))
      })
      .listen(port, '0.0.0.0')
  })
}

async function start() {
  const startedAt = new Date()
  const port = process.env.PORT || process.env.DEV_PORT || '3002'
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  const free = await checkPortFree(port)
  if (!free) {
    // If the port is busy we back off without spawning infinite competing processes
    const backoff = Math.min(30000, 1000 * Math.pow(2, Math.min(5, restartCount)))
    console.log(`[dev-wrapper] Port ${port} already in use. Will retry in ${Math.round(backoff/1000)}s. (Tip: kill stray node processes or choose a different port with DEV_PORT.)`)
    restartCount++
    setTimeout(start, backoff)
    return
  }
  console.log(`[dev-wrapper] Launching Next.js at ${startedAt.toISOString()} on port ${port}`)
  const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env
  })

  const scheduleRestart = (code, signal, label = 'exit') => {
    const runtime = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1)
    const reason = `code=${code} signal=${signal}`
    const backoff = Math.min(30000, 1000 * Math.pow(2, Math.min(5, restartCount))) // 1s -> 32s cap
    console.log(`[dev-wrapper] next dev ${label} (${reason}) after ${runtime}s, restarting in ${Math.round(backoff / 1000)}s...`)
    restartCount++
    setTimeout(start, backoff)
  }

  child.on('exit', (code, signal) => scheduleRestart(code, signal, 'exit'))
  child.on('close', (code, signal) => scheduleRestart(code, signal, 'close'))
  child.on('error', err => {
    console.error('[dev-wrapper] Spawn error:', err)
    scheduleRestart(1, 'SPAWN_ERROR', 'error')
  })
}

process.on('uncaughtException', err => {
  console.error('[dev-wrapper] uncaughtException', err)
})
process.on('unhandledRejection', reason => {
  console.error('[dev-wrapper] unhandledRejection', reason)
})

start()
