"""Inference, SHAP explainability, and model artifact loading."""

from __future__ import annotations

import json
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from config import (
    ENCODER_PATH,
    FEATURE_COLUMNS,
    FEATURE_IMPORTANCE_PATH,
    FEATURE_LABELS,
    METRICS_PATH,
    MODEL_PATH,
    SCALER_PATH,
)
from preprocessing import transform_input
from utils import logger, recommendations_for, risk_label


class ModelNotReadyError(RuntimeError):
    """Raised when model artifacts are missing."""


@lru_cache(maxsize=1)
def load_artifacts() -> dict[str, Any]:
    """Load model, scaler, and encoders (cached)."""
    missing = [
        p.name
        for p in (MODEL_PATH, SCALER_PATH, ENCODER_PATH)
        if not Path(p).exists()
    ]
    if missing:
        raise ModelNotReadyError(
            f"Missing artifacts: {', '.join(missing)}. Run `python train.py` first."
        )

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    encoders = joblib.load(ENCODER_PATH)
    logger.info("Model artifacts loaded successfully")
    return {"model": model, "scaler": scaler, "encoders": encoders}


def reload_artifacts() -> dict[str, Any]:
    """Clear cache and reload artifacts (e.g. after retraining)."""
    load_artifacts.cache_clear()
    return load_artifacts()


def get_model_info() -> dict[str, Any]:
    """Return model metadata for /model-info."""
    artifacts_ready = all(
        Path(p).exists() for p in (MODEL_PATH, SCALER_PATH, ENCODER_PATH)
    )
    metrics = {}
    if METRICS_PATH.exists():
        with open(METRICS_PATH, encoding="utf-8") as f:
            metrics = json.load(f)

    return {
        "model_name": "Logistic Regression",
        "algorithm": "sklearn.linear_model.LogisticRegression",
        "features": FEATURE_COLUMNS,
        "feature_labels": FEATURE_LABELS,
        "artifacts_ready": artifacts_ready,
        "best_params": metrics.get("best_params"),
        "best_cv_f1": metrics.get("best_cv_f1"),
        "metrics_summary": {
            "accuracy": metrics.get("accuracy"),
            "precision": metrics.get("precision"),
            "recall": metrics.get("recall"),
            "f1_score": metrics.get("f1_score"),
            "auc": metrics.get("auc"),
        }
        if metrics
        else None,
    }


def get_metrics() -> dict[str, Any]:
    """Load saved evaluation metrics."""
    if not METRICS_PATH.exists():
        raise FileNotFoundError("Metrics not found. Train the model first.")
    with open(METRICS_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_feature_importance() -> list[dict[str, Any]]:
    """Load feature importance from reports."""
    if FEATURE_IMPORTANCE_PATH.exists():
        with open(FEATURE_IMPORTANCE_PATH, encoding="utf-8") as f:
            return json.load(f)

    artifacts = load_artifacts()
    model = artifacts["model"]
    coefs = model.coef_[0]
    importance = [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "coefficient": float(coef),
            "importance": float(abs(coef)),
        }
        for name, coef in zip(FEATURE_COLUMNS, coefs)
    ]
    importance.sort(key=lambda x: x["importance"], reverse=True)
    return importance


def _shap_explanation(
    model,
    X_scaled: np.ndarray,
    top_k: int = 5,
) -> dict[str, Any]:
    """Compute SHAP values for a single prediction."""
    try:
        import shap

        explainer = shap.LinearExplainer(model, np.zeros((1, X_scaled.shape[1])))
        # Prefer newer API; fall back to shap_values
        try:
            explanation = explainer(X_scaled)
            values = np.array(explanation.values)[0]
        except Exception:
            values = np.array(explainer.shap_values(X_scaled))
            if values.ndim > 1 and values.shape[0] == 1:
                values = values[0]
            if isinstance(values, list):
                values = np.array(values[1] if len(values) > 1 else values[0])
                if values.ndim > 1:
                    values = values[0]
    except Exception as exc:
        # Coefficient-based fallback explanation
        logger.warning("SHAP unavailable (%s); using coefficient fallback", exc)
        coefs = model.coef_[0]
        values = coefs * X_scaled[0]

    items = [
        {
            "feature": FEATURE_COLUMNS[i],
            "label": FEATURE_LABELS.get(FEATURE_COLUMNS[i], FEATURE_COLUMNS[i]),
            "contribution": float(values[i]),
            "abs_contribution": float(abs(values[i])),
        }
        for i in range(len(FEATURE_COLUMNS))
    ]
    positives = sorted(
        [i for i in items if i["contribution"] > 0],
        key=lambda x: x["contribution"],
        reverse=True,
    )[:top_k]
    negatives = sorted(
        [i for i in items if i["contribution"] < 0],
        key=lambda x: x["contribution"],
    )[:top_k]
    ranked = sorted(items, key=lambda x: x["abs_contribution"], reverse=True)

    return {
        "top_positive": positives,
        "top_negative": negatives,
        "all_contributions": ranked,
        "importance_graph": [
            {"feature": i["label"], "value": i["contribution"]} for i in ranked
        ],
    }


def predict(features: dict[str, Any]) -> dict[str, Any]:
    """Run end-to-end prediction with SHAP and recommendations."""
    start = time.perf_counter()
    artifacts = load_artifacts()
    model = artifacts["model"]
    scaler = artifacts["scaler"]
    encoders = artifacts["encoders"]

    X = transform_input(features, scaler, encoders)
    proba_arr = model.predict_proba(X)[0]
    prediction = int(model.predict(X)[0])
    # Probability of positive (heart disease) class
    classes = list(model.classes_)
    pos_idx = classes.index(1) if 1 in classes else -1
    probability = float(proba_arr[pos_idx])
    confidence = float(max(proba_arr))
    elapsed_ms = (time.perf_counter() - start) * 1000

    shap_data = _shap_explanation(model, X)

    result = {
        "prediction": prediction,
        "risk_label": risk_label(prediction),
        "probability": probability,
        "risk_percent": round(probability * 100, 2),
        "confidence_percent": round(confidence * 100, 2),
        "model_name": "Logistic Regression",
        "prediction_time_ms": round(elapsed_ms, 3),
        "shap_explanation": shap_data,
        "feature_importance": get_feature_importance(),
        "recommendations": recommendations_for(prediction),
        "inputs": {k: features[k] for k in FEATURE_COLUMNS},
        "timestamp": pd.Timestamp.utcnow().isoformat(),
    }
    return result
