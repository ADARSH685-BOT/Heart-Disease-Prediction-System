import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = {
  high: '#DC2626',
  low: '#059669',
  blue: '#2574EB',
  sky: '#0EA5E9',
  emerald: '#10B981',
}

export function RiskPieChart({ high = 0, low = 0 }) {
  const data = [
    { name: 'High Risk', value: high },
    { name: 'Low Risk', value: low },
  ]
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
        >
          <Cell fill={COLORS.high} />
          <Cell fill={COLORS.low} />
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function FeatureBarChart({ data = [] }) {
  const rows = data.slice(0, 10).map((d) => ({
    name: d.label || d.feature,
    value: Number(d.importance ?? Math.abs(d.coefficient ?? d.value ?? 0)),
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS.blue} radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HistoryLineChart({ items = [] }) {
  const data = [...items]
    .reverse()
    .slice(-20)
    .map((item, idx) => ({
      name: `#${item.id ?? idx + 1}`,
      risk: item.risk_percent,
      date: item.date ? new Date(item.date).toLocaleDateString() : '',
    }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="risk"
          name="Risk %"
          stroke={COLORS.sky}
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ProbabilityAreaChart({ items = [] }) {
  const data = [...items]
    .reverse()
    .slice(-20)
    .map((item, idx) => ({
      name: `#${item.id ?? idx + 1}`,
      probability: Number(((item.probability ?? 0) * 100).toFixed(2)),
    }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="probFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="probability"
          name="Probability %"
          stroke={COLORS.emerald}
          fill="url(#probFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ShapBarChart({ contributions = [] }) {
  const data = contributions.slice(0, 10).map((c) => ({
    name: c.label || c.feature,
    value: Number(c.contribution ?? c.value ?? 0),
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.value >= 0 ? COLORS.high : COLORS.low}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
