import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  HeartPulse,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FeatureBarChart, ShapBarChart } from '../components/Charts'
import RiskGauge from '../components/RiskGauge'
import { PageHeader } from '../components/StatCard'
import { loadResult } from '../hooks/usePrediction'
import { downloadPdf } from '../services/api'

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const stored = loadResult()
    if (!stored) {
      navigate('/predict', { replace: true })
      return
    }
    setResult(stored)
  }, [navigate])

  if (!result) return null

  const high = result.prediction === 1
  const shap = result.shap_explanation || {}

  const onDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const blob = await downloadPdf(result)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'heart_prediction_report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err?.response?.data?.detail || 'PDF download failed')
    } finally {
      setPdfLoading(false)
    }
  }

  const onDownloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prediction_result.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prediction Outcome"
        title={high ? 'Elevated Cardiac Risk Detected' : 'Low Cardiac Risk Profile'}
        subtitle="Review probability, confidence, SHAP drivers, and personalized recommendations."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/predict" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              New prediction
            </Link>
            <button type="button" className="btn-primary" onClick={onDownloadPdf} disabled={pdfLoading}>
              <FileText className="h-4 w-4" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-[2rem] p-6 lg:col-span-1 ${
            high ? 'ring-2 ring-rose-300/60' : 'ring-2 ring-emerald-300/60'
          }`}
        >
          <RiskGauge percent={result.risk_percent} highRisk={high} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Probability</p>
              <p className="mt-1 font-display text-xl font-bold">
                {(result.probability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Confidence</p>
              <p className="mt-1 font-display text-xl font-bold">
                {result.confidence_percent.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>
              <span className="font-semibold">Model:</span> {result.model_name}
            </p>
            <p>
              <span className="font-semibold">Latency:</span> {result.prediction_time_ms} ms
            </p>
          </div>
          <button type="button" onClick={onDownloadJson} className="btn-secondary mt-4 w-full">
            <Download className="h-4 w-4" />
            Download JSON
          </button>
        </motion.div>

        <div className="space-y-6 lg:col-span-2">
          <div className="glass rounded-[2rem] p-6">
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-brand-600" />
              <h3 className="font-display text-lg font-bold">SHAP Feature Contributions</h3>
            </div>
            <ShapBarChart contributions={shap.importance_graph || shap.all_contributions || []} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                Top positive factors
              </p>
              <ul className="space-y-2">
                {(shap.top_positive || []).map((item) => (
                  <li
                    key={item.feature}
                    className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm dark:bg-rose-950/40"
                  >
                    <span>{item.label}</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-300">
                      +{item.contribution.toFixed(3)}
                    </span>
                  </li>
                ))}
                {!shap.top_positive?.length && (
                  <li className="text-sm text-slate-500">No strong positive drivers</li>
                )}
              </ul>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Top protective factors
              </p>
              <ul className="space-y-2">
                {(shap.top_negative || []).map((item) => (
                  <li
                    key={item.feature}
                    className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40"
                  >
                    <span>{item.label}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {item.contribution.toFixed(3)}
                    </span>
                  </li>
                ))}
                {!shap.top_negative?.length && (
                  <li className="text-sm text-slate-500">No strong protective drivers</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-[2rem] p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Global Feature Importance</h3>
          <FeatureBarChart data={result.feature_importance || []} />
        </div>
        <div className="glass rounded-[2rem] p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Recommendations</h3>
          <ul className="space-y-3">
            {(result.recommendations || []).map((rec) => (
              <li
                key={rec}
                className="flex gap-3 rounded-2xl border border-sky-100 bg-white/60 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
              >
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${high ? 'text-rose-500' : 'text-emerald-500'}`}
                />
                {rec}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Disclaimer: This is an AI-assisted screening aid, not a medical diagnosis. Consult a qualified clinician.
          </p>
        </div>
      </div>
    </div>
  )
}
