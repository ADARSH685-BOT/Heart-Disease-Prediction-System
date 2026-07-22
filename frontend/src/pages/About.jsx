import { motion } from 'framer-motion'
import {
  Database,
  GitBranch,
  LineChart,
  Users,
  Workflow,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/StatCard'
import { getMetrics, getModelInfo } from '../services/api'

const STEPS = [
  'Load & profile the Kaggle / UCI heart disease dataset',
  'Clean duplicates, impute missing values, encode categoricals',
  'Standardize features and split 80/20 (random_state=42)',
  'Tune Logistic Regression with GridSearchCV + 5-fold CV',
  'Evaluate accuracy, precision, recall, F1, ROC-AUC',
  'Serve predictions with SHAP explanations via FastAPI',
]

export default function About() {
  const [info, setInfo] = useState(null)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    getModelInfo().then(setInfo).catch(() => {})
    getMetrics().then(setMetrics).catch(() => {})
  }, [])

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Product"
        title="About HeartDiseaseAI"
        subtitle="A production-minded heart disease risk platform combining classical ML, explainability, and a clinical-grade interface."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[2rem] p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-xl font-bold">Model</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            We use <strong>Logistic Regression</strong> — a transparent, well-calibrated classifier
            suited to tabular clinical data. Hyperparameters are selected with{' '}
            <strong>GridSearchCV</strong> optimizing F1 score under stratified cross-validation.
          </p>
          {info?.best_params && (
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs text-sky-200">
              {JSON.stringify(info.best_params, null, 2)}
            </pre>
          )}
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-[2rem] p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            <h2 className="font-display text-xl font-bold">Dataset</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Training uses the classic heart disease clinical features (age, sex, chest pain type,
            blood pressure, cholesterol, ECG, max heart rate, exercise angina, oldpeak, slope, CA,
            thal). Place <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">heart.csv</code>{' '}
            in the project <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">dataset/</code>{' '}
            folder (Kaggle: moridata/heart-disease-dataset). The training pipeline loads it automatically.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <li className="rounded-xl bg-brand-50 px-3 py-2 dark:bg-slate-800">13 clinical features</li>
            <li className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-slate-800">Binary risk target</li>
            <li className="rounded-xl bg-sky-50 px-3 py-2 dark:bg-slate-800">80/20 stratified split</li>
            <li className="rounded-xl bg-indigo-50 px-3 py-2 dark:bg-slate-800">StandardScaler + encoders</li>
          </ul>
        </motion.article>
      </div>

      <article className="glass rounded-[2rem] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Workflow className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-xl font-bold">Workflow</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {STEPS.map((step, idx) => (
            <li
              key={step}
              className="flex gap-3 rounded-2xl border border-sky-100 bg-white/50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/40"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </article>

      <article className="glass rounded-[2rem] p-6">
        <div className="mb-4 flex items-center gap-2">
          <LineChart className="h-5 w-5 text-emerald-600" />
          <h2 className="font-display text-xl font-bold">Performance</h2>
        </div>
        {metrics ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Accuracy', metrics.accuracy],
              ['Precision', metrics.precision],
              ['Recall', metrics.recall],
              ['F1', metrics.f1_score],
              ['AUC', metrics.auc],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {typeof value === 'number' ? value.toFixed(3) : '—'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Train the model to populate performance metrics.</p>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Evaluation plots (ROC, confusion matrix, learning curve, feature importance, correlation heatmap)
          are saved under <code>backend/reports/</code>.
        </p>
      </article>

      <article className="glass rounded-[2rem] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-xl font-bold">Developers</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Built as a full-stack healthcare ML product: FastAPI backend, React + Vite frontend,
          SQLite history store, Docker packaging, and GitHub Actions CI. Designed for clarity,
          modularity, and production readiness — not a throwaway academic demo.
        </p>
      </article>
    </div>
  )
}
