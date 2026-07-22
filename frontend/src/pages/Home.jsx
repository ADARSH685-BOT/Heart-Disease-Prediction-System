import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Brain,
  HeartPulse,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MedicalIllustration from '../components/MedicalIllustration'
import { StatCard } from '../components/StatCard'
import { getModelInfo } from '../services/api'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
}

export default function Home() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [])

  const metrics = info?.metrics_summary || {}

  return (
    <div className="space-y-16">
      {/* Hero — brand first, one composition */}
      <section className="relative overflow-hidden rounded-[2rem] bg-hero-mesh px-6 py-12 md:px-12 md:py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-emerald-50/30 dark:from-slate-950/40 dark:to-slate-900/20" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <p className="font-display text-4xl font-extrabold tracking-tight text-brand-900 md:text-6xl dark:text-white">
              HeartDiseaseAI
            </p>
            <h1 className="mt-4 max-w-xl font-display text-2xl font-semibold leading-snug text-slate-800 md:text-3xl dark:text-slate-100">
              Clinical-grade heart risk prediction, explained.
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600 dark:text-slate-300">
              Logistic Regression with SHAP explainability — designed for clarity,
              confidence, and care-team workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/predict" className="btn-primary">
                Start AI Prediction
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-secondary">
                How it works
              </Link>
            </div>
          </motion.div>

          <MedicalIllustration className="relative z-10 mx-auto w-full max-w-xl drop-shadow-2xl" />
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              Model Snapshot
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Performance at a glance
            </h2>
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-brand-700 dark:text-sky-300">
            Open dashboard →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Activity}
            label="Accuracy"
            value={metrics.accuracy != null ? `${(metrics.accuracy * 100).toFixed(1)}%` : '—'}
            tone="blue"
          />
          <StatCard
            icon={HeartPulse}
            label="F1 Score"
            value={metrics.f1_score != null ? metrics.f1_score.toFixed(3) : '—'}
            tone="emerald"
          />
          <StatCard
            icon={ShieldCheck}
            label="AUC"
            value={metrics.auc != null ? metrics.auc.toFixed(3) : '—'}
            tone="violet"
          />
          <StatCard
            icon={Brain}
            label="Recall"
            value={metrics.recall != null ? `${(metrics.recall * 100).toFixed(1)}%` : '—'}
            tone="rose"
          />
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: 'AI Prediction',
            body: 'Enter clinical vitals and receive risk probability, confidence, and clear recommendations in seconds.',
          },
          {
            icon: Brain,
            title: 'SHAP Explainability',
            body: 'See which factors push risk up or down — transparent, clinician-friendly explanations.',
          },
          {
            icon: ShieldCheck,
            title: 'Care-ready Reports',
            body: 'Download PDF reports, track history, and export CSV for audits and follow-up.',
          },
        ].map((card, i) => (
          <motion.article
            key={card.title}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="glass rounded-3xl p-6"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-sky-300">
              <card.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {card.body}
            </p>
          </motion.article>
        ))}
      </section>

      {/* CTA */}
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-800 via-brand-700 to-emerald-600 px-8 py-12 text-white shadow-soft md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold">Ready to assess heart risk?</h2>
            <p className="mt-2 max-w-xl text-white/85">
              Run a guided prediction with validated clinical features from the UCI / Kaggle heart disease dataset schema.
            </p>
          </div>
          <Link
            to="/predict"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-display text-sm font-bold text-brand-800 shadow-lg transition hover:bg-sky-50"
          >
            Launch Predictor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
