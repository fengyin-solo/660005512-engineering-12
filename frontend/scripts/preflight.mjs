#!/usr/bin/env node
/**
 * dev server 启动前预检(npm run dev 会自动先执行):
 *  1. Node 版本
 *  2. 依赖是否已安装(node_modules / vite)
 *  3. 前端端口是否被占用
 *  4. 后端端口是否可达(仅警告,不阻断,方便只调前端样式时启动)
 *
 * 任何硬性问题都以中文明确报错并退出,而不是让 vite 静默换端口或白屏。
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import net from 'node:net'
import http from 'node:http'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function info(msg) { console.log(`[信息] ${msg}`) }
function warn(msg) { console.warn(`[警告] ${msg}`) }
function fail(msg) {
  console.error(`\n[错误] ${msg}\n`)
  process.exit(1)
}

function parseEnv() {
  const env = { ...process.env }
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return env
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith('#') || !s.includes('=')) continue
    const idx = s.indexOf('=')
    const key = s.slice(0, idx).trim()
    const val = s.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in env)) env[key] = val
  }
  return env
}

const major = Number(process.versions.node.split('.')[0])
if (Number.isNaN(major) || major < 18) {
  fail(`需要 Node.js 18+,当前为 ${process.versions.node}。请升级 Node 后重试。`)
}

if (!existsSync(join(root, 'node_modules'))) {
  fail('尚未安装前端依赖(node_modules 不存在)。\n       请先执行: npm install')
}
if (!existsSync(join(root, 'node_modules', 'vite'))) {
  fail('缺少 vite,依赖安装不完整。请重新执行: npm install')
}

const env = parseEnv()
const devPort = Number(env.VITE_DEV_PORT || 3000)
const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1'
const backendPort = Number(env.VITE_BACKEND_PORT || 8000)

if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
  fail(`VITE_DEV_PORT 不是合法端口: ${env.VITE_DEV_PORT}`)
}

function portFree(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, host)
  })
}

// 同时探测 IPv4/IPv6 回环:旧进程只绑 ::1 时,仅查 0.0.0.0 会漏报,
// 而 Vite 解析 localhost 可能优先走 ::1 导致启动时 EADDRINUSE。
async function portFreeBothStacks(port) {
  const [v4, v6] = await Promise.all([portFree(port, '127.0.0.1'), portFree(port, '::1')])
  return v4 && v6
}

function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: backendPort, path: '/health', timeout: 800 }, (res) => {
      res.destroy()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

const occupiedHint = process.platform === 'win32'
  ? `排查命令: netstat -ano | findstr :${devPort}`
  : `排查命令: lsof -i :${devPort}   # 或: ss -lntp | grep ${devPort}`

const free = await portFreeBothStacks(devPort)
if (!free) {
  fail(`前端端口 ${devPort} 已被占用。\n` +
       `       请释放该端口,或修改 frontend/.env 中的 VITE_DEV_PORT。\n       ${occupiedHint}`)
}

const backendOk = await checkBackend()
if (!backendOk) {
  warn(`后端 ${backendHost}:${backendPort} 暂不可达,页面能打开但行情/回测会失败。`)
  warn('请在另一个终端先启动后端: cd backend && python dev.py start')
} else {
  info(`后端联通正常 (${backendHost}:${backendPort}/health)`)
}
info(`预检通过,前端将监听端口 ${devPort}`)
