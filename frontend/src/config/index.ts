/**
 * 前后端联调地址统一从环境配置读取(见 frontend/.env.example)。
 *
 * - API/WS 基址未配置时使用同源相对路径(/api、/ws),由 Vite dev proxy 转发;
 * - 需要直连后端时,用 VITE_API_BASE_URL / VITE_WS_BASE_URL 指定完整地址。
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, '') ?? ''

/** 行情通道 WebSocket 地址 */
export function marketWsUrl(): string {
  if (WS_BASE_URL) return `${WS_BASE_URL}/ws`
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

/** 回测接口地址 */
export function backtestUrl(): string {
  return `${API_BASE_URL}/api/backtest`
}

/** 后端健康检查地址(联调预检用) */
export function healthUrl(): string {
  return `${API_BASE_URL}/health`
}
