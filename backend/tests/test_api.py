"""Unit tests for preprocessing, prediction schemas, and utilities."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from config import FEATURE_COLUMNS, TARGET_COLUMN  # noqa: E402
from preprocessing import clean_dataset, dataset_info, encode_features  # noqa: E402
from utils import recommendations_for, risk_label  # noqa: E402


def _sample_df(n: int = 40) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    data = {
        "age": rng.integers(30, 80, n),
        "sex": rng.integers(0, 2, n),
        "cp": rng.integers(0, 4, n),
        "trestbps": rng.integers(100, 180, n),
        "chol": rng.integers(150, 350, n),
        "fbs": rng.integers(0, 2, n),
        "restecg": rng.integers(0, 3, n),
        "thalach": rng.integers(100, 200, n),
        "exang": rng.integers(0, 2, n),
        "oldpeak": rng.random(n) * 4,
        "slope": rng.integers(0, 3, n),
        "ca": rng.integers(0, 4, n),
        "thal": rng.integers(0, 4, n),
        "target": rng.integers(0, 2, n),
    }
    return pd.DataFrame(data)


def test_risk_label():
    assert risk_label(0) == "Low Risk"
    assert risk_label(1) == "High Risk"


def test_recommendations():
    low = recommendations_for(0)
    high = recommendations_for(1)
    assert any("healthy" in r.lower() or "exercise" in r.lower() for r in low)
    assert any("cardiologist" in r.lower() for r in high)


def test_clean_and_encode():
    df = _sample_df()
    df.loc[0, "chol"] = np.nan
    df = pd.concat([df, df.iloc[[0]]], ignore_index=True)
    info = dataset_info(df)
    assert info["rows"] == len(df)
    cleaned = clean_dataset(df)
    assert cleaned[TARGET_COLUMN].isna().sum() == 0
    encoded, encoders = encode_features(cleaned, fit=True)
    assert "sex" in encoders
    assert encoded.shape[0] > 0


def test_api_health():
    from app import app

    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_predict_validation():
    from app import app

    client = TestClient(app)
    res = client.post("/api/predict", json={"age": -1})
    assert res.status_code == 422


def test_model_info_endpoint():
    from app import app

    client = TestClient(app)
    res = client.get("/api/model-info")
    assert res.status_code == 200
    body = res.json()
    assert body["model_name"] == "Logistic Regression"
    assert body["features"] == FEATURE_COLUMNS
