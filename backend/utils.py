"""Logging, PDF generation, and shared helpers."""

from __future__ import annotations

import logging
import sys
from datetime import datetime
from io import BytesIO
from typing import Any

from config import LOG_LEVEL


def setup_logging(name: str = "heartdisease") -> logging.Logger:
    """Configure and return a module logger."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


logger = setup_logging()


def risk_label(prediction: int) -> str:
    """Map binary prediction to human-readable risk label."""
    return "High Risk" if int(prediction) == 1 else "Low Risk"


def recommendations_for(prediction: int) -> list[str]:
    """Return lifestyle / clinical recommendations based on risk."""
    if int(prediction) == 1:
        return [
            "Consult a cardiologist for a comprehensive evaluation.",
            "Avoid smoking and limit alcohol consumption.",
            "Reduce dietary cholesterol and saturated fats.",
            "Exercise regularly under medical guidance.",
            "Schedule routine medical checkups and monitor blood pressure.",
            "Manage stress with mindfulness or counseling support.",
        ]
    return [
        "Maintain a healthy lifestyle with balanced nutrition.",
        "Exercise at least 150 minutes per week at moderate intensity.",
        "Follow a heart-healthy diet rich in vegetables and whole grains.",
        "Keep blood pressure and cholesterol within recommended ranges.",
        "Continue annual wellness checkups for early detection.",
    ]


def generate_pdf_report(payload: dict[str, Any]) -> bytes:
    """Generate a downloadable PDF prediction report."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCustom",
        parent=styles["Heading1"],
        textColor=colors.HexColor("#0B4F8A"),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "HeadingCustom",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#0B4F8A"),
        spaceBefore=16,
        spaceAfter=8,
    )
    body = styles["BodyText"]

    story: list[Any] = []
    story.append(Paragraph("Heart Disease AI — Prediction Report", title_style))
    story.append(
        Paragraph(
            f"Generated: {payload.get('timestamp', datetime.utcnow().isoformat())} UTC",
            body,
        )
    )
    story.append(Spacer(1, 12))

    prediction = payload.get("prediction", 0)
    risk = risk_label(prediction)
    risk_color = colors.HexColor("#DC2626") if prediction == 1 else colors.HexColor("#059669")

    summary = [
        ["Field", "Value"],
        ["Prediction", risk],
        ["Probability", f"{payload.get('probability', 0):.2%}"],
        ["Risk Score", f"{payload.get('risk_percent', 0):.1f}%"],
        ["Confidence", f"{payload.get('confidence_percent', 0):.1f}%"],
        ["Model", payload.get("model_name", "Logistic Regression")],
        ["Prediction Time", f"{payload.get('prediction_time_ms', 0):.2f} ms"],
    ]
    table = Table(summary, colWidths=[2.5 * inch, 3.5 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B4F8A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (1, 1), (1, 1), risk_color),
                ("TEXTCOLOR", (1, 1), (1, 1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)

    inputs = payload.get("inputs", {})
    if inputs:
        story.append(Paragraph("Patient Inputs", heading_style))
        rows = [["Feature", "Value"]] + [[str(k), str(v)] for k, v in inputs.items()]
        input_table = Table(rows, colWidths=[2.5 * inch, 3.5 * inch])
        input_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0EA5E9")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F9FF")]),
                ]
            )
        )
        story.append(input_table)

    shap = payload.get("shap_explanation", {})
    if shap:
        story.append(Paragraph("SHAP Explainability", heading_style))
        positives = shap.get("top_positive", [])
        negatives = shap.get("top_negative", [])
        if positives:
            story.append(Paragraph("<b>Top positive risk factors</b>", body))
            for item in positives:
                story.append(
                    Paragraph(
                        f"• {item.get('feature')}: {item.get('contribution', 0):+.4f}",
                        body,
                    )
                )
        if negatives:
            story.append(Paragraph("<b>Top protective factors</b>", body))
            for item in negatives:
                story.append(
                    Paragraph(
                        f"• {item.get('feature')}: {item.get('contribution', 0):+.4f}",
                        body,
                    )
                )

    recs = payload.get("recommendations") or recommendations_for(prediction)
    story.append(Paragraph("Recommendations", heading_style))
    for rec in recs:
        story.append(Paragraph(f"• {rec}", body))

    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "<i>Disclaimer: This report is an AI-assisted screening aid and is not a "
            "medical diagnosis. Always consult a qualified healthcare professional.</i>",
            body,
        )
    )

    doc.build(story)
    return buffer.getvalue()
