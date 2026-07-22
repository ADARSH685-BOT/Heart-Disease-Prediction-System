import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export async function predictHeartDisease(payload) {
  const { data } = await client.post('/predict', payload)
  return data
}

export async function getModelInfo() {
  const { data } = await client.get('/model-info')
  return data
}

export async function getMetrics() {
  const { data } = await client.get('/metrics')
  return data
}

export async function getHistory(params = {}) {
  const { data } = await client.get('/history', { params })
  return data
}

export async function deleteHistoryItem(id) {
  const { data } = await client.delete(`/history/${id}`)
  return data
}

export async function clearHistory() {
  const { data } = await client.delete('/history')
  return data
}

export async function getReports() {
  const { data } = await client.get('/report')
  return data
}

export async function downloadPdf(resultPayload) {
  const response = await client.post('/report/pdf', resultPayload, {
    responseType: 'blob',
  })
  return response.data
}

export function exportHistoryCsv(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
    ),
  ).toString()
  const url = `${API_BASE}/history/export/csv${query ? `?${query}` : ''}`
  window.open(url, '_blank')
}

export default client
