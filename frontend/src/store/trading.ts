import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Tick, OrderBook, GridConfig, GridResult } from '@/types'
import { marketWsUrl, backtestUrl } from '../config'

const WS_RECONNECT_DELAY = 2000

export const useTradingStore = defineStore('trading', () => {
  const loading = ref(false)
  const ticks = ref<Tick[]>([])
  const orderBook = ref<OrderBook | null>(null)
  const gridResult = ref<GridResult | null>(null)
  const wsConnected = ref(false)
  const config = ref<GridConfig>({ lowerPrice: 95, upperPrice: 115, gridCount: 20, capitalPerGrid: 1000, initialCapital: 100000 })

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manualClose = false

  function clearReconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  function connectWS() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    manualClose = false
    const url = marketWsUrl()
    try {
      ws = new WebSocket(url)
    } catch (e) {
      console.error('[行情] WebSocket 创建失败:', e)
      scheduleReconnect()
      return
    }
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.ticks) ticks.value = d.ticks.slice(-60)
        if (d.orderBook) orderBook.value = d.orderBook
      } catch (err) {
        console.warn('[行情] 无法解析推送数据:', err)
      }
    }
    ws.onerror = () => { wsConnected.value = false }
    ws.onclose = () => {
      wsConnected.value = false
      if (!manualClose) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectWS()
    }, WS_RECONNECT_DELAY)
  }

  async function runBacktest() {
    loading.value = true
    try {
      const resp = await fetch(backtestUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.value)
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
      gridResult.value = await resp.json()
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('[回测] 请求失败:', err)
      ElMessage.error(`回测请求失败,请确认后端已启动 (${detail})`)
    } finally {
      loading.value = false
    }
  }

  function disconnectWS() {
    manualClose = true
    clearReconnect()
    ws?.close()
    ws = null
    wsConnected.value = false
  }

  return { loading, ticks, orderBook, gridResult, wsConnected, config, connectWS, runBacktest, disconnectWS }
})
