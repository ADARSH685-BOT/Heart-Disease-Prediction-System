"""FastAPI application — Heart Disease Prediction API."""

from __future__ import annotations

import csv
import io
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from config import API_PREFIX, CORS_ORIGINS, REPORTS_DIR
from database import (
    clear_history,
    delete_prediction,
    get_db,
    init_db,
    query_history,
    record_to_dict,
    save_prediction,
)
from predict import (
    ModelNotReadyError,
    get_feature_importance,
    get_metrics,
    get_model_info,
    predict as run_predict,
    reload_artifacts,
)
from utils import generate_pdf_report, logger, setup_logging

setup_logging()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    try:
        reload_artifacts()
        logger.info("Model artifacts ready")
    except ModelNotReadyError as exc:
        logger.warning("%s — API will start; train model before predicting", exc)
    yield


app = FastAPI(
    title="Heart Disease AI API",
    description=(
        "Production REST API for heart disease risk prediction using "
        "Logistic Regression with SHAP explainability."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if REPORTS_DIR.exists():
    app.mount("/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    """Patient clinical features for prediction."""

    age: int = Field(..., ge=1, le=120, description="Age in years")
    sex: int = Field(..., ge=0, le=1, description="0 = Female, 1 = Male")
    cp: int = Field(..., ge=0, le=3, description="Chest pain type (0–3)")
    trestbps: int = Field(..., ge=50, le=250, description="Resting blood pressure (mm Hg)")
    chol: int = Field(..., ge=50, le=600, description="Serum cholesterol (mg/dl)")
    fbs: int = Field(..., ge=0, le=1, description="Fasting blood sugar > 120 mg/dl")
    restecg: int = Field(..., ge=0, le=2, description="Resting ECG results (0–2)")
    thalach: int = Field(..., ge=50, le=250, description="Maximum heart rate achieved")
    exang: int = Field(..., ge=0, le=1, description="Exercise-induced angina")
    oldpeak: float = Field(..., ge=0.0, le=10.0, description="ST depression")
    slope: int = Field(..., ge=0, le=2, description="Slope of peak exercise ST segment")
    ca: int = Field(..., ge=0, le=4, description="Number of major vessels (0–4)")
    thal: int = Field(..., ge=0, le=3, description="Thalassemia (0–3)")

    @field_validator("oldpeak")
    @classmethod
    def round_oldpeak(cls, v: float) -> float:
        return round(float(v), 2)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "age": 63,
                    "sex": 1,
                    "cp": 3,
                    "trestbps": 145,
                    "chol": 233,
                    "fbs": 1,
                    "restecg": 0,
                    "thalach": 150,
                    "exang": 0,
                    "oldpeak": 2.3,
                    "slope": 0,
                    "ca": 0,
                    "thal": 1,
                }
            ]
        }
    }


class PredictResponse(BaseModel):
    prediction: int
    risk_label: str
    probability: float
    risk_percent: float
    confidence_percent: float
    model_name: str
    prediction_time_ms: float
    shap_explanation: dict[str, Any]
    feature_importance: list[dict[str, Any]]
    recommendations: list[str]
    inputs: dict[str, Any]
    timestamp: str
    history_id: Optional[int] = None


class MessageResponse(BaseModel):
    message: str
    detail: Optional[Any] = None


# ---------------------------------------------------------------------------
# Lifecycle handled by lifespan above
# ---------------------------------------------------------------------------


@app.get("/", tags=["Health"])
def root() -> dict[str, str]:
    return {
        "service": "Heart Disease AI API",
        "status": "ok",
        "docs": "/docs",
        "api": API_PREFIX,
    }


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------


@app.post(f"{API_PREFIX}/predict", response_model=PredictResponse, tags=["Prediction"])
def predict_endpoint(
    payload: PredictRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Predict heart disease risk and store history."""
    try:
        features = payload.model_dump()
        result = run_predict(features)
        row = save_prediction(
            db,
            {
                **features,
                "prediction": result["prediction"],
                "probability": result["probability"],
                "risk_percent": result["risk_percent"],
                "confidence_percent": result["confidence_percent"],
                "model_name": result["model_name"],
            },
        )
        result["history_id"] = row.id
        return result
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Model / Metrics / Reports
# ---------------------------------------------------------------------------


@app.get(f"{API_PREFIX}/model-info", tags=["Model"])
def model_info() -> dict[str, Any]:
    """Return model metadata and summary metrics."""
    return get_model_info()


@app.get(f"{API_PREFIX}/metrics", tags=["Model"])
def metrics() -> dict[str, Any]:
    """Return full evaluation metrics."""
    try:
        return get_metrics()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get(f"{API_PREFIX}/feature-importance", tags=["Model"])
def feature_importance() -> dict[str, Any]:
    try:
        return {"features": get_feature_importance()}
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get(f"{API_PREFIX}/report", tags=["Reports"])
def list_reports() -> dict[str, Any]:
    """List available evaluation report artifacts."""
    if not REPORTS_DIR.exists():
        return {"reports": []}
    files = sorted(p.name for p in REPORTS_DIR.iterdir() if p.is_file())
    return {
        "reports": files,
        "urls": {name: f"/reports/{name}" for name in files},
    }


@app.get(f"{API_PREFIX}/report/{{filename}}", tags=["Reports"])
def get_report_file(filename: str) -> FileResponse:
    """Download a specific report file."""
    safe = Path(filename).name
    path = REPORTS_DIR / safe
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path)


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------


@app.get(f"{API_PREFIX}/history", tags=["History"])
def history(
    risk: Optional[Literal["high", "low"]] = Query(None),
    age_min: Optional[int] = Query(None, ge=0, le=120),
    age_max: Optional[int] = Query(None, ge=0, le=120),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve filtered prediction history."""
    rows = query_history(
        db,
        risk=risk,
        age_min=age_min,
        age_max=age_max,
        date_from=date_from,
        date_to=date_to,
        search=search,
        limit=limit,
        offset=offset,
    )
    items = [record_to_dict(r) for r in rows]
    high = sum(1 for i in items if i["prediction"] == 1)
    low = sum(1 for i in items if i["prediction"] == 0)
    return {
        "total": len(items),
        "high_risk": high,
        "low_risk": low,
        "items": items,
    }


@app.delete(f"{API_PREFIX}/history/{{prediction_id}}", tags=["History"])
def remove_history(prediction_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    ok = delete_prediction(db, prediction_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return MessageResponse(message="Deleted", detail={"id": prediction_id})


@app.delete(f"{API_PREFIX}/history", tags=["History"])
def remove_all_history(db: Session = Depends(get_db)) -> MessageResponse:
    count = clear_history(db)
    return MessageResponse(message="History cleared", detail={"deleted": count})


@app.get(f"{API_PREFIX}/history/export/csv", tags=["History"])
def export_csv(
    risk: Optional[Literal["high", "low"]] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Export filtered history as CSV."""
    rows = query_history(
        db,
        risk=risk,
        age_min=age_min,
        age_max=age_max,
        search=search,
        limit=5000,
    )
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "age",
            "gender",
            "prediction",
            "risk_label",
            "probability",
            "risk_percent",
            "confidence_percent",
            "model_name",
            "date",
        ],
    )
    writer.writeheader()
    for row in rows:
        data = record_to_dict(row)
        writer.writerow({k: data.get(k) for k in writer.fieldnames})

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prediction_history.csv"},
    )


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


@app.post(f"{API_PREFIX}/report/pdf", tags=["Reports"])
def download_pdf(payload: PredictResponse) -> Response:
    """Generate a PDF from a prediction result payload."""
    try:
        pdf_bytes = generate_pdf_report(payload.model_dump())
    except Exception as exc:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=heart_prediction_report.pdf"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):  # type: ignore[no-untyped-def]
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn

    from config import API_HOST, API_PORT

    uvicorn.run("app:app", host=API_HOST, port=API_PORT, reload=True)
