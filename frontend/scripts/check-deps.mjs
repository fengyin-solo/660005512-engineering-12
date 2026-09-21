// 启动/打包前的依赖检查：缺依赖或依赖损坏时给出明确提示并以非零码退出，而不是静默失败
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))

const required = ['vue', 'pinia', 'axios', 'element-plus', 'echarts', 'vite', 'typescript']

if (!existsSync(join(root, 'node_modules'))) {
  console.error('[错误] 未找到 node_modules，前端依赖尚未安装。')
  console.error('       请先在 frontend 目录执行: npm install')
  process.exit(1)
}

const missing = required.filter((pkg) => {
  try {
    require.resolve(pkg)
    return false
  } catch {
    return true
  }
})

if (missing.length > 0) {
  console.error(`[错误] 缺少依赖: ${missing.join(', ')}`)
  console.error('       请先在 frontend 目录执行: npm install')
  process.exit(1)
}

// 仅 resolve 通过不代表可用（例如 node_modules 从其他平台拷贝、可选原生依赖缺失），
// 实际加载 vite 与 rollup 做一次健康检查，把晦涩的堆栈换成可操作的提示
for (const pkg of ['vite', 'rollup']) {
  try {
    require(pkg)
  } catch (err) {
    console.error(`[错误] 依赖已安装但加载失败: ${err.message}`)
    console.error('       node_modules 可能已损坏或来自其他平台，请执行: rm -rf node_modules && npm install')
    process.exit(1)
  }
}
