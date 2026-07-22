import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  LayoutDashboard,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/predict', label: 'Predict' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
]

export default function Layout() {
  const { dark, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-sky-100/70 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-emerald-500 text-white shadow-soft">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-brand-900 dark:text-white">
                HeartDiseaseAI
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                Clinical Risk Intelligence
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-sky-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/predict" className="btn-primary hidden sm:inline-flex">
              <Sparkles className="h-4 w-4" />
              Run Prediction
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="rounded-xl border border-sky-100 bg-white/80 p-2.5 text-brand-700 transition hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="rounded-xl border border-sky-100 p-2.5 md:hidden dark:border-slate-700"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-sky-100 md:hidden dark:border-slate-800"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {item.label}
                  </NavLink>
                ))}
                <Link
                  to="/predict"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Predict Now
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-sky-100/80 bg-white/50 py-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} HeartDiseaseAI — AI-assisted screening, not a medical diagnosis.
          </p>
          <p className="font-medium text-brand-700 dark:text-sky-300">
            Logistic Regression · SHAP · FastAPI · React
          </p>
        </div>
      </footer>
    </div>
  )
}
