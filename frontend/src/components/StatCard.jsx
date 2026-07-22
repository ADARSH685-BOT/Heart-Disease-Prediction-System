import { motion } from 'framer-motion'

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 ${className}`}
    />
  )
}

export function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-brand-600 to-sky-400',
    emerald: 'from-emerald-600 to-teal-400',
    rose: 'from-rose-600 to-orange-400',
    violet: 'from-indigo-600 to-sky-400',
  }
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass rounded-3xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone]} text-white shadow-soft`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            {eyebrow}
          </p>
        )}
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
