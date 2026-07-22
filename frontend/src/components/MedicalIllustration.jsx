import { motion } from 'framer-motion'

/** Inline medical / cardiology illustration for the hero. */
export default function MedicalIllustration({ className = '' }) {
  return (
    <motion.svg
      viewBox="0 0 560 420"
      className={className}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B4F8A" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.2" />
        </linearGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <ellipse cx="280" cy="340" rx="180" ry="28" fill="#0EA5E9" opacity="0.12" filter="url(#soft)" />

      {/* Monitor frame */}
      <rect x="70" y="48" width="420" height="280" rx="28" fill="url(#g1)" opacity="0.95" />
      <rect x="88" y="66" width="384" height="220" rx="18" fill="#071A2E" />

      {/* ECG line */}
      <motion.path
        d="M110 180 H180 L200 120 L230 230 L255 150 L280 180 H340 L360 140 L385 210 L410 180 H450"
        fill="none"
        stroke="url(#g2)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
      />

      {/* Heart */}
      <motion.path
        d="M280 310c-28-18-56-40-56-70a32 32 0 0 1 56-21 32 32 0 0 1 56 21c0 30-28 52-56 70z"
        fill="#34D399"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '280px 260px' }}
      />

      {/* Floating chips */}
      <rect x="40" y="120" width="86" height="36" rx="12" fill="white" opacity="0.92" />
      <text x="52" y="143" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#0B4F8A" fontWeight="700">
        AUC 0.87+
      </text>
      <rect x="430" y="90" width="96" height="36" rx="12" fill="white" opacity="0.92" />
      <text x="442" y="113" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#059669" fontWeight="700">
        SHAP Ready
      </text>
    </motion.svg>
  )
}
