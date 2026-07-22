"""Dataset loading and preprocessing pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from config import (
    CATEGORICAL_FEATURES,
    DATASET_PATH,
    ENCODER_PATH,
    FEATURE_COLUMNS,
    NUMERICAL_FEATURES,
    RANDOM_STATE,
    REPORTS_DIR,
    SCALER_PATH,
    TARGET_COLUMN,
    TEST_SIZE,
)
from utils import logger


def find_dataset(path: Path | None = None) -> Path:
    """Locate heart disease CSV in the project dataset folder."""
    candidate = Path(path) if path else DATASET_PATH
    if candidate.exists():
        return candidate

    dataset_dir = candidate.parent if candidate.parent.exists() else DATASET_PATH.parent
    for name in ("heart.csv", "heart_disease.csv", "dataset.csv", "Heart.csv"):
        alt = dataset_dir / name
        if alt.exists():
            logger.info("Using dataset at %s", alt)
            return alt

    matches = list(dataset_dir.glob("*.csv")) if dataset_dir.exists() else []
    if matches:
        logger.info("Using first CSV found: %s", matches[0])
        return matches[0]

    raise FileNotFoundError(
        f"Dataset not found. Place heart.csv in {dataset_dir} "
        "(Kaggle: moridata/heart-disease-dataset)."
    )


def load_dataset(path: Path | None = None) -> pd.DataFrame:
    """Load the heart disease dataset, stripping BOM if present."""
    csv_path = find_dataset(path)
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    df.columns = [c.strip().lower() for c in df.columns]

    # Normalize common alternate column names
    rename_map = {
        "target": TARGET_COLUMN,
        "output": TARGET_COLUMN,
        "heart_disease": TARGET_COLUMN,
        "condition": TARGET_COLUMN,
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    if TARGET_COLUMN not in df.columns:
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' not found. Columns: {list(df.columns)}"
        )

    logger.info("Loaded dataset from %s — shape %s", csv_path, df.shape)
    return df


def dataset_info(df: pd.DataFrame) -> dict[str, Any]:
    """Summarize dataset for logging and API."""
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing_values": {c: int(v) for c, v in df.isna().sum().items()},
        "duplicates": int(df.duplicated().sum()),
        "target_distribution": {
            str(k): int(v) for k, v in df[TARGET_COLUMN].value_counts().items()
        },
    }


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicates and handle missing values."""
    before = len(df)
    df = df.copy()

    # Replace common sentinel missing markers
    df = df.replace(["?", "NA", "N/A", "null", "Null", ""], np.nan)

    for col in FEATURE_COLUMNS + [TARGET_COLUMN]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.drop_duplicates()
    logger.info("Removed %d duplicate rows", before - len(df))

    # Impute numerical with median, categorical with mode
    for col in NUMERICAL_FEATURES:
        if col in df.columns and df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    for col in CATEGORICAL_FEATURES + [TARGET_COLUMN]:
        if col in df.columns and df[col].isna().any():
            mode = df[col].mode()
            fill = mode.iloc[0] if len(mode) else 0
            df[col] = df[col].fillna(fill)

    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])

    # Binary target for multi-class Cleveland-style labels (0 vs 1+)
    df[TARGET_COLUMN] = (df[TARGET_COLUMN].astype(float) > 0).astype(int)

    logger.info("Cleaned dataset shape: %s", df.shape)
    return df.reset_index(drop=True)


def encode_features(
    df: pd.DataFrame,
    encoders: dict[str, LabelEncoder] | None = None,
    fit: bool = True,
) -> tuple[pd.DataFrame, dict[str, LabelEncoder]]:
    """Encode categorical columns with LabelEncoders."""
    df = df.copy()
    encoders = encoders or {}

    for col in CATEGORICAL_FEATURES:
        if col not in df.columns:
            continue
        values = df[col].astype(str)
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(values)
            encoders[col] = le
        else:
            le = encoders[col]
            # Handle unseen labels gracefully
            known = set(le.classes_)
            mapped = values.map(lambda x: x if x in known else le.classes_[0])
            df[col] = le.transform(mapped)

    return df, encoders


def scale_features(
    X: pd.DataFrame | np.ndarray,
    scaler: StandardScaler | None = None,
    fit: bool = True,
) -> tuple[np.ndarray, StandardScaler]:
    """Standardize numerical feature matrix."""
    if scaler is None:
        scaler = StandardScaler()
    if fit:
        X_scaled = scaler.fit_transform(X)
    else:
        X_scaled = scaler.transform(X)
    return X_scaled, scaler


def prepare_xy(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Select model features and target."""
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {missing}")
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].astype(int)
    return X, y


def train_test_matrices(
    df: pd.DataFrame,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, StandardScaler, dict, list[str]]:
    """Full preprocessing → train/test split with scaling."""
    info = dataset_info(df)
    logger.info("Dataset info: %s", info)

    df = clean_dataset(df)
    df, encoders = encode_features(df, fit=True)
    X, y = prepare_xy(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Persist artifacts used at inference
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoders, ENCODER_PATH)
    logger.info("Saved scaler -> %s", SCALER_PATH)
    logger.info("Saved encoders -> %s", ENCODER_PATH)

    # Correlation heatmap data
    corr = pd.concat([X, y], axis=1).corr()
    corr.to_csv(REPORTS_DIR / "correlation_matrix.csv")

    return (
        X_train_scaled,
        X_test_scaled,
        y_train.to_numpy(),
        y_test.to_numpy(),
        scaler,
        encoders,
        FEATURE_COLUMNS,
    )


def transform_input(
    features: dict[str, Any],
    scaler: StandardScaler,
    encoders: dict[str, LabelEncoder],
) -> np.ndarray:
    """Transform a single patient feature dict into a scaled model vector."""
    row = {col: features[col] for col in FEATURE_COLUMNS}
    df = pd.DataFrame([row])
    df, _ = encode_features(df, encoders=encoders, fit=False)
    X = df[FEATURE_COLUMNS].astype(float)
    return scaler.transform(X)
