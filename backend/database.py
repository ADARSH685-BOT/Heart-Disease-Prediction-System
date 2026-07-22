"""SQLite persistence for prediction history."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, desc
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import DATABASE_URL
from utils import logger


class Base(DeclarativeBase):
    pass


class PredictionRecord(Base):
    """Stored prediction history row."""

    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(16), nullable=False)
    prediction = Column(Integer, nullable=False)
    probability = Column(Float, nullable=False)
    risk_percent = Column(Float, nullable=False)
    confidence_percent = Column(Float, nullable=False)
    model_name = Column(String(64), nullable=False, default="Logistic Regression")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Full input snapshot for filters / exports
    sex = Column(Integer, nullable=True)
    cp = Column(Integer, nullable=True)
    trestbps = Column(Integer, nullable=True)
    chol = Column(Integer, nullable=True)
    fbs = Column(Integer, nullable=True)
    restecg = Column(Integer, nullable=True)
    thalach = Column(Integer, nullable=True)
    exang = Column(Integer, nullable=True)
    oldpeak = Column(Float, nullable=True)
    slope = Column(Integer, nullable=True)
    ca = Column(Integer, nullable=True)
    thal = Column(Integer, nullable=True)


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized at %s", DATABASE_URL)


def get_db():
    """FastAPI dependency yielding a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def save_prediction(db: Session, record: dict[str, Any]) -> PredictionRecord:
    """Persist a prediction result."""
    gender = "Male" if int(record.get("sex", 0)) == 1 else "Female"
    row = PredictionRecord(
        age=int(record["age"]),
        gender=gender,
        prediction=int(record["prediction"]),
        probability=float(record["probability"]),
        risk_percent=float(record["risk_percent"]),
        confidence_percent=float(record["confidence_percent"]),
        model_name=record.get("model_name", "Logistic Regression"),
        sex=int(record.get("sex", 0)),
        cp=int(record.get("cp", 0)),
        trestbps=int(record.get("trestbps", 0)),
        chol=int(record.get("chol", 0)),
        fbs=int(record.get("fbs", 0)),
        restecg=int(record.get("restecg", 0)),
        thalach=int(record.get("thalach", 0)),
        exang=int(record.get("exang", 0)),
        oldpeak=float(record.get("oldpeak", 0.0)),
        slope=int(record.get("slope", 0)),
        ca=int(record.get("ca", 0)),
        thal=int(record.get("thal", 0)),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def query_history(
    db: Session,
    *,
    risk: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[PredictionRecord]:
    """Filter and return prediction history."""
    q = db.query(PredictionRecord)

    if risk == "high":
        q = q.filter(PredictionRecord.prediction == 1)
    elif risk == "low":
        q = q.filter(PredictionRecord.prediction == 0)

    if age_min is not None:
        q = q.filter(PredictionRecord.age >= age_min)
    if age_max is not None:
        q = q.filter(PredictionRecord.age <= age_max)
    if date_from is not None:
        q = q.filter(PredictionRecord.created_at >= date_from)
    if date_to is not None:
        q = q.filter(PredictionRecord.created_at <= date_to)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (PredictionRecord.gender.ilike(like))
            | (PredictionRecord.model_name.ilike(like))
        )

    return (
        q.order_by(desc(PredictionRecord.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )


def delete_prediction(db: Session, prediction_id: int) -> bool:
    """Delete a history row by id."""
    row = db.query(PredictionRecord).filter(PredictionRecord.id == prediction_id).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def clear_history(db: Session) -> int:
    """Delete all history rows. Returns count deleted."""
    count = db.query(PredictionRecord).count()
    db.query(PredictionRecord).delete()
    db.commit()
    return count


def record_to_dict(row: PredictionRecord) -> dict[str, Any]:
    """Serialize a PredictionRecord."""
    return {
        "id": row.id,
        "age": row.age,
        "gender": row.gender,
        "prediction": row.prediction,
        "risk_label": "High Risk" if row.prediction == 1 else "Low Risk",
        "probability": row.probability,
        "risk_percent": row.risk_percent,
        "confidence_percent": row.confidence_percent,
        "model_name": row.model_name,
        "date": row.created_at.isoformat() if row.created_at else None,
        "sex": row.sex,
        "cp": row.cp,
        "trestbps": row.trestbps,
        "chol": row.chol,
        "fbs": row.fbs,
        "restecg": row.restecg,
        "thalach": row.thalach,
        "exang": row.exang,
        "oldpeak": row.oldpeak,
        "slope": row.slope,
        "ca": row.ca,
        "thal": row.thal,
    }
