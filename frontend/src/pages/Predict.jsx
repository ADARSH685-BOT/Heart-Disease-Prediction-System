import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/StatCard'
import { DEFAULT_FORM, FORM_FIELDS, saveResult } from '../hooks/usePrediction'
import { predictHeartDisease } from '../services/api'

export default function Predict() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (name, raw) => {
    const field = FORM_FIELDS.find((f) => f.name === name)
    let value = raw
    if (field?.type === 'number' || field?.type === 'select') {
      value = name === 'oldpeak' ? parseFloat(raw) : parseInt(raw, 10)
      if (Number.isNaN(value)) value = ''
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, oldpeak: Number(form.oldpeak) }
      const result = await predictHeartDisease(payload)
      saveResult(result)
      navigate('/result')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).join(', ')
            : err.message || 'Prediction failed. Is the API running?',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clinical Input"
        title="Heart Risk Prediction"
        subtitle="Enter patient vitals and diagnostic features. The model returns risk probability, confidence, and SHAP explanations."
      />

      <form onSubmit={onSubmit} className="glass relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-emerald-500 text-white">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Patient Feature Form
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All fields are required · Validated against clinical ranges
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_FIELDS.map((field) => (
            <label key={field.name} className="block">
              <span className="label-field">
                {field.label}
                {field.hint ? ` (${field.hint})` : ''}
              </span>
              {field.type === 'select' ? (
                <select
                  className="input-field"
                  value={form[field.name]}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input-field"
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={form[field.name]}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required
                />
              )}
            </label>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary min-w-[180px]" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              'Predict Risk'
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setForm(DEFAULT_FORM)}
            disabled={loading}
          >
            Reset defaults
          </button>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-white/70 backdrop-blur-sm dark:bg-slate-950/70"
            >
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="font-display text-sm font-semibold text-brand-800 dark:text-sky-300">
                Running Logistic Regression + SHAP…
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  )
}
