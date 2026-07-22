"""Train Logistic Regression with GridSearchCV and generate evaluation reports."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    auc,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, learning_curve

from config import (
    FEATURE_COLUMNS,
    FEATURE_IMPORTANCE_PATH,
    FEATURE_LABELS,
    METRICS_PATH,
    MODEL_PATH,
    RANDOM_STATE,
    REPORTS_DIR,
    CV_FOLDS,
)
from preprocessing import load_dataset, train_test_matrices
from utils import logger

sns.set_theme(style="whitegrid", context="notebook")


def build_param_grid() -> dict:
    """Hyperparameter grid for Logistic Regression."""
    return {
        "C": [0.01, 0.1, 1.0, 10.0, 100.0],
        "penalty": ["l1", "l2"],
        "solver": ["liblinear"],
        "max_iter": [1000],
        "class_weight": [None, "balanced"],
    }


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> tuple[LogisticRegression, dict]:
    """Cross-validated GridSearch for Logistic Regression."""
    base = LogisticRegression(random_state=RANDOM_STATE)
    grid = GridSearchCV(
        estimator=base,
        param_grid=build_param_grid(),
        cv=CV_FOLDS,
        scoring="f1",
        n_jobs=-1,
        refit=True,
        verbose=1,
    )
    logger.info("Starting GridSearchCV (%d folds)...", CV_FOLDS)
    grid.fit(X_train, y_train)
    logger.info("Best params: %s", grid.best_params_)
    logger.info("Best CV F1: %.4f", grid.best_score_)

    cv_summary = {
        "best_params": grid.best_params_,
        "best_cv_f1": float(grid.best_score_),
        "cv_folds": CV_FOLDS,
    }
    return grid.best_estimator_, cv_summary


def evaluate_model(
    model: LogisticRegression,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: list[str],
) -> dict:
    """Compute metrics and save all evaluation plots."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "classification_report": classification_report(
            y_test, y_pred, output_dict=True, zero_division=0
        ),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "features": feature_names,
    }

    # ROC / AUC
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    roc_auc = float(auc(fpr, tpr))
    metrics["auc"] = roc_auc

    _plot_roc(fpr, tpr, roc_auc)
    _plot_confusion(y_test, y_pred)
    _plot_learning_curve(model, X_train, y_train)
    importance = _plot_feature_importance(model, feature_names)
    metrics["feature_importance"] = importance

    with open(FEATURE_IMPORTANCE_PATH, "w", encoding="utf-8") as f:
        json.dump(importance, f, indent=2)

    logger.info(
        "Test metrics — Acc: %.4f | Prec: %.4f | Rec: %.4f | F1: %.4f | AUC: %.4f",
        metrics["accuracy"],
        metrics["precision"],
        metrics["recall"],
        metrics["f1_score"],
        metrics["auc"],
    )
    return metrics


def _plot_roc(fpr: np.ndarray, tpr: np.ndarray, roc_auc: float) -> None:
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(fpr, tpr, color="#0EA5E9", lw=2.5, label=f"ROC (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], color="#94A3B8", linestyle="--", lw=1.5)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve — Logistic Regression")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "roc_curve.png", dpi=150)
    plt.close(fig)


def _plot_confusion(y_true: np.ndarray, y_pred: np.ndarray) -> None:
    fig, ax = plt.subplots(figsize=(7, 6))
    ConfusionMatrixDisplay.from_predictions(
        y_true,
        y_pred,
        display_labels=["Low Risk", "High Risk"],
        cmap="Blues",
        ax=ax,
        colorbar=True,
    )
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "confusion_matrix.png", dpi=150)
    plt.close(fig)


def _plot_learning_curve(
    model: LogisticRegression,
    X: np.ndarray,
    y: np.ndarray,
) -> None:
    train_sizes, train_scores, val_scores = learning_curve(
        model,
        X,
        y,
        cv=CV_FOLDS,
        n_jobs=-1,
        train_sizes=np.linspace(0.2, 1.0, 8),
        scoring="accuracy",
        shuffle=True,
        random_state=RANDOM_STATE,
    )
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(
        train_sizes,
        train_scores.mean(axis=1),
        "o-",
        color="#0B4F8A",
        label="Training score",
    )
    ax.fill_between(
        train_sizes,
        train_scores.mean(axis=1) - train_scores.std(axis=1),
        train_scores.mean(axis=1) + train_scores.std(axis=1),
        alpha=0.15,
        color="#0B4F8A",
    )
    ax.plot(
        train_sizes,
        val_scores.mean(axis=1),
        "o-",
        color="#10B981",
        label="Cross-validation score",
    )
    ax.fill_between(
        train_sizes,
        val_scores.mean(axis=1) - val_scores.std(axis=1),
        val_scores.mean(axis=1) + val_scores.std(axis=1),
        alpha=0.15,
        color="#10B981",
    )
    ax.set_xlabel("Training examples")
    ax.set_ylabel("Accuracy")
    ax.set_title("Learning Curve")
    ax.legend(loc="best")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "learning_curve.png", dpi=150)
    plt.close(fig)


def _plot_feature_importance(
    model: LogisticRegression,
    feature_names: list[str],
) -> list[dict]:
    coefs = model.coef_[0]
    importance = [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "coefficient": float(coef),
            "importance": float(abs(coef)),
        }
        for name, coef in zip(feature_names, coefs)
    ]
    importance.sort(key=lambda x: x["importance"], reverse=True)

    labels = [i["label"] for i in importance]
    values = [i["coefficient"] for i in importance]
    colors = ["#DC2626" if v > 0 else "#059669" for v in values]

    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh(labels[::-1], values[::-1], color=colors[::-1])
    ax.axvline(0, color="#64748B", lw=1)
    ax.set_xlabel("Logistic Regression Coefficient")
    ax.set_title("Feature Importance (Model Coefficients)")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "feature_importance.png", dpi=150)
    plt.close(fig)
    return importance


def plot_correlation_heatmap(df: pd.DataFrame) -> None:
    """Save correlation heatmap from cleaned feature matrix."""
    from preprocessing import clean_dataset, encode_features, prepare_xy

    cleaned = clean_dataset(df)
    encoded, _ = encode_features(cleaned, fit=True)
    X, y = prepare_xy(encoded)
    corr = pd.concat([X, y.rename("target")], axis=1).corr()

    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(
        corr,
        annot=True,
        fmt=".2f",
        cmap="RdBu_r",
        center=0,
        square=True,
        ax=ax,
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title("Feature Correlation Heatmap")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "correlation_heatmap.png", dpi=150)
    plt.close(fig)


def save_metrics(metrics: dict, cv_summary: dict) -> Path:
    """Write metrics JSON for the API."""
    payload = {
        "model_name": "Logistic Regression",
        "algorithm": "sklearn.linear_model.LogisticRegression",
        **cv_summary,
        **metrics,
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    logger.info("Metrics saved -> %s", METRICS_PATH)
    return METRICS_PATH


def main() -> None:
    """Entrypoint: load data → train → evaluate → persist artifacts."""
    logger.info("=" * 60)
    logger.info("Heart Disease AI — Model Training Pipeline")
    logger.info("=" * 60)

    df = load_dataset()
    plot_correlation_heatmap(df)

    (
        X_train,
        X_test,
        y_train,
        y_test,
        _scaler,
        _encoders,
        feature_names,
    ) = train_test_matrices(df)

    model, cv_summary = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_train, y_train, X_test, y_test, feature_names)
    save_metrics(metrics, cv_summary)

    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved -> %s", MODEL_PATH)
    logger.info("Training complete. Reports in %s", REPORTS_DIR)


if __name__ == "__main__":
    main()
