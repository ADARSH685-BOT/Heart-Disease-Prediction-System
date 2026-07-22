import { motion } from 'framer-motion'

/**
 * Circular risk gauge using SVG arc.
 */
export default function RiskGauge({ percent = 0, highRisk = false }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  const radius = 84
  const stroke = 14
  const c = 2 * Math.PI * radius
  const offset = c - (clamped / 100) * c
  const color = highRisk ? '#DC2626' : '#059669'

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200 dark:text-slate-700"
        />
        <motion.circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Risk Score
        </p>
        <p className="font-display text-4xl font-extrabold" style={{ color }}>
          {clamped.toFixed(1)}%
        </p>
        <p
          className={`mt-1 rounded-full px-3 py-0.5 text-xs font-bold ${
            highRisk
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          }`}
        >
          {highRisk ? 'High Risk' : 'Low Risk'}
        </p>
      </div>
    </div>
  )
}
