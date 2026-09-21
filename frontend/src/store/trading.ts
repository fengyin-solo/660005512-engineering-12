import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { Tick, OrderBook, GridConfig, GridResult } from '@/types'

// 接口地址统一走环境配置：默认经 Vite 代理访问后端，也可用 VITE_API_BASE_URL / VITE_WS_URL 直连
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export const useTradingStore = defineStore('trading', () => {
  const loading = ref(false)
  const ticks = ref<Tick[]>([])
  const orderBook = ref<OrderBook | null>(null)
  const gridResult = ref<GridResult | null>(null)
  const wsConnected = ref(false)
  const config = ref<GridConfig>({ lowerPrice: 95, upperPrice: 115, gridCount: 20, capitalPerGrid: 1000, initialCapital: 100000 })

  let ws: WebSocket | null = null
  function connectWS() {
    ws = new WebSocket(WS_URL)
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.ticks) ticks.value = d.ticks.slice(-60)
        if (d.orderBook) orderBook.value = d.orderBook
      } catch {}
    }
    ws.onclose = () => { wsConnected.value = false }
  }

  async function runBacktest() {
    loading.value = true
    try { const { data } = await axios.post(`${API_BASE}/api/backtest`, config.value) ; gridResult.value = data }
    finally { loading.value = false }
  }

  function disconnectWS() { ws?.close(); ws = null; wsConnected.value = false }

  return { loading, ticks, orderBook, gridResult, wsConnected, config, connectWS, runBacktest, disconnectWS }
})
