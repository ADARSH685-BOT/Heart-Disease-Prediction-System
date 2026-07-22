import { useEffect, useState } from 'react'

const STORAGE_KEY = 'hda_last_result'

export function saveResult(result) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
}

export function loadResult() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function usePredictionResult() {
  const [result, setResult] = useState(() => loadResult())

  useEffect(() => {
    if (result) saveResult(result)
  }, [result])

  return { result, setResult, clear: () => { sessionStorage.removeItem(STORAGE_KEY); setResult(null) } }
}

/** Field metadata for the prediction form */
export const FORM_FIELDS = [
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    min: 1,
    max: 120,
    step: 1,
    hint: 'Years',
  },
  {
    name: 'sex',
    label: 'Sex',
    type: 'select',
    options: [
      { value: 1, label: 'Male' },
      { value: 0, label: 'Female' },
    ],
  },
  {
    name: 'cp',
    label: 'Chest Pain Type',
    type: 'select',
    options: [
      { value: 0, label: 'Typical Angina' },
      { value: 1, label: 'Atypical Angina' },
      { value: 2, label: 'Non-anginal Pain' },
      { value: 3, label: 'Asymptomatic' },
    ],
  },
  {
    name: 'trestbps',
    label: 'Resting Blood Pressure',
    type: 'number',
    min: 50,
    max: 250,
    step: 1,
    hint: 'mm Hg',
  },
  {
    name: 'chol',
    label: 'Cholesterol',
    type: 'number',
    min: 50,
    max: 600,
    step: 1,
    hint: 'mg/dl',
  },
  {
    name: 'fbs',
    label: 'Fasting Blood Sugar > 120',
    type: 'select',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Yes' },
    ],
  },
  {
    name: 'restecg',
    label: 'Resting ECG',
    type: 'select',
    options: [
      { value: 0, label: 'Normal' },
      { value: 1, label: 'ST-T Abnormality' },
      { value: 2, label: 'Left Ventricular Hypertrophy' },
    ],
  },
  {
    name: 'thalach',
    label: 'Maximum Heart Rate',
    type: 'number',
    min: 50,
    max: 250,
    step: 1,
    hint: 'bpm',
  },
  {
    name: 'exang',
    label: 'Exercise-Induced Angina',
    type: 'select',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Yes' },
    ],
  },
  {
    name: 'oldpeak',
    label: 'Oldpeak (ST Depression)',
    type: 'number',
    min: 0,
    max: 10,
    step: 0.1,
    hint: 'mm',
  },
  {
    name: 'slope',
    label: 'ST Slope',
    type: 'select',
    options: [
      { value: 0, label: 'Upsloping' },
      { value: 1, label: 'Flat' },
      { value: 2, label: 'Downsloping' },
    ],
  },
  {
    name: 'ca',
    label: 'Major Vessels (CA)',
    type: 'select',
    options: [
      { value: 0, label: '0' },
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
      { value: 4, label: '4' },
    ],
  },
  {
    name: 'thal',
    label: 'Thalassemia',
    type: 'select',
    options: [
      { value: 0, label: 'Unknown / Null' },
      { value: 1, label: 'Fixed Defect' },
      { value: 2, label: 'Normal' },
      { value: 3, label: 'Reversible Defect' },
    ],
  },
]

export const DEFAULT_FORM = {
  age: 54,
  sex: 1,
  cp: 0,
  trestbps: 130,
  chol: 250,
  fbs: 0,
  restecg: 1,
  thalach: 150,
  exang: 0,
  oldpeak: 1.0,
  slope: 1,
  ca: 0,
  thal: 2,
}
