import { motion } from 'framer-motion'
import {
  Activity,
  Download,
  Filter,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  FeatureBarChart,
  HistoryLineChart,
  ProbabilityAreaChart,
  RiskPieChart,
} from '../components/Charts'
import { PageHeader, Skeleton, StatCard } from '../components/StatCard'
import {
  clearHistory,
  deleteHistoryItem,
  exportHistoryCsv,
  getHistory,
  getMetrics,
} from '../services/api'
import api from '../services/api'

async function loadImportance() {
  try {
    const { data } = await api.get('/feature-importance')
    return data.features || []
  } catch {
    return []
  }
}

export default function Dashboard() {
  const [history, setHistory] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [importance, setImportance] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    risk: '',
    age_min: '',
    age_max: '',
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search) params.search = filters.search
      if (filters.risk) params.risk = filters.risk
      if (filters.age_min !== '') params.age_min = Number(filters.age_min)
      if (filters.age_max !== '') params.age_max = Number(filters.age_max)

      const [hist, mets, imp] = await Promise.all([
        getHistory(params),
        getMetrics().catch(() => null),
        loadImportance(),
      ])
      setHistory(hist)
      setMetrics(mets)
      setImportance(imp)
    } catch (err) {
      console.error(err)
      setHistory({ items: [], total: 0, high_risk: 0, low_risk: 0 })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const onDelete = async (id) => {
    if (!confirm('Delete this prediction?')) return
    await deleteHistoryItem(id)
    fetchAll()
  }

  const onClear = async () => {
    if (!confirm('Clear entire prediction history?')) return
    await clearHistory()
    fetchAll()
  }

  const items = history?.items || []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Prediction Dashboard"
        subtitle="Search, filter, and visualize previous assessments. Export CSV for audits."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                exportHistoryCsv({
                  search: filters.search || undefined,
                  risk: filters.risk || undefined,
                  age_min: filters.age_min || undefined,
                  age_max: filters.age_max || undefined,
                })
              }
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button type="button" className="btn-secondary text-rose-600" onClick={onClear}>
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard icon={Users} label="Total Predictions" value={history?.total ?? 0} tone="blue" />
            <StatCard icon={Activity} label="High Risk" value={history?.high_risk ?? 0} tone="rose" />
            <StatCard icon={Activity} label="Low Risk" value={history?.low_risk ?? 0} tone="emerald" />
            <StatCard
              icon={Activity}
              label="Model Accuracy"
              value={
                metrics?.accuracy != null ? `${(metrics.accuracy * 100).toFixed(1)}%` : '—'
              }
              tone="violet"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Search gender / model…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select
            className="input-field"
            value={filters.risk}
            onChange={(e) => setFilters((f) => ({ ...f, risk: e.target.value }))}
          >
            <option value="">All risk levels</option>
            <option value="high">High risk</option>
            <option value="low">Low risk</option>
          </select>
          <input
            className="input-field"
            type="number"
            placeholder="Min age"
            value={filters.age_min}
            onChange={(e) => setFilters((f) => ({ ...f, age_min: e.target.value }))}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Max age"
            value={filters.age_max}
            onChange={(e) => setFilters((f) => ({ ...f, age_max: e.target.value }))}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-[2rem] p-5">
          <h3 className="mb-2 font-display font-bold">Risk Distribution</h3>
          <RiskPieChart high={history?.high_risk || 0} low={history?.low_risk || 0} />
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h3 className="mb-2 font-display font-bold">Feature Importance</h3>
          <FeatureBarChart data={importance.length ? importance : metrics?.feature_importance || []} />
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h3 className="mb-2 font-display font-bold">Prediction History</h3>
          <HistoryLineChart items={items} />
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h3 className="mb-2 font-display font-bold">Probability Trend</h3>
          <ProbabilityAreaChart items={items} />
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-[2rem]">
        <div className="border-b border-sky-100 px-5 py-4 dark:border-slate-800">
          <h3 className="font-display font-bold">Previous Predictions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Probability</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading history…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No predictions yet. Run one from the Predict page.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-sky-50 dark:border-slate-800"
                >
                  <td className="px-4 py-3 font-medium">#{row.id}</td>
                  <td className="px-4 py-3">{row.age}</td>
                  <td className="px-4 py-3">{row.gender}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        row.prediction === 1
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {row.risk_label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{(row.probability * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-500">
                    {row.date ? new Date(row.date).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
