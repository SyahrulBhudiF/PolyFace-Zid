import io
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from .insights import generate_ocean_insights, get_level


# =========================
# COLORS
# =========================
PRIMARY = colors.HexColor("#2563EB")
GRAY = colors.HexColor("#6B7280")
LIGHT_BG = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#E5E7EB")

TRAIT_COLORS = {
    "openness": colors.HexColor("#3B82F6"),
    "conscientiousness": colors.HexColor("#10B981"),
    "extraversion": colors.HexColor("#F59E0B"),
    "agreeableness": colors.HexColor("#8B5CF6"),
    "neuroticism": colors.HexColor("#EF4444"),
}

TRAIT_LABELS = {
    "openness": "Openness",
    "conscientiousness": "Conscientiousness",
    "extraversion": "Extraversion",
    "agreeableness": "Agreeableness",
    "neuroticism": "Neuroticism",
}


# =========================
# STYLES
# =========================
def styles():
    s = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "title",
            fontSize=22,
            alignment=TA_CENTER,
            textColor=PRIMARY,
            spaceAfter=12,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontSize=12,
            alignment=TA_CENTER,
            textColor=GRAY,
            spaceAfter=20,
        ),
        "section": ParagraphStyle(
            "section",
            fontSize=14,
            fontName="Helvetica-Bold",
            spaceBefore=20,
            spaceAfter=10,
        ),
        "body": ParagraphStyle(
            "body",
            fontSize=11,
            alignment=TA_JUSTIFY,
            leading=16,
        ),
        "muted": ParagraphStyle(
            "muted",
            fontSize=9,
            textColor=GRAY,
        ),
        "trait": ParagraphStyle(
            "trait",
            fontSize=12,
            fontName="Helvetica-Bold",
        ),
        "footer": ParagraphStyle(
            "footer",
            fontSize=8,
            textColor=GRAY,
            alignment=TA_CENTER,
        ),
    }


# =========================
# HELPERS
# =========================
def score_bar(score: float, color, width):
    filled = max(0, min(score, 100)) / 100 * width
    empty = width - filled

    return Table(
        [["", ""]],
        colWidths=[filled, empty],
        rowHeights=[10],
        style=[
            ("BACKGROUND", (0, 0), (0, 0), color),
            ("BACKGROUND", (1, 0), (1, 0), BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ],
    )


# =========================
# MAIN GENERATOR
# =========================
def generate_pdf_report(
    detection,
    user_name: str,
    user_email: str,
    output_path: Optional[str] = None,
) -> io.BytesIO:

    scores = {
        "openness": detection.openness,
        "conscientiousness": detection.conscientiousness,
        "extraversion": detection.extraversion,
        "agreeableness": detection.agreeableness,
        "neuroticism": detection.neuroticism,
    }

    insights = generate_ocean_insights(scores)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    st = styles()
    story = []

    # ================= HEADER =================
    story.append(Paragraph("OCEAN Personality Report", st["title"]))
    story.append(Paragraph("Big Five Personality Analysis Results", st["subtitle"]))

    story.append(
        Table([[""]], colWidths=[doc.width], rowHeights=[1],
              style=[("BACKGROUND", (0, 0), (-1, -1), PRIMARY)])
    )
    story.append(Spacer(1, 20))

    # ================= PROFILE CARD =================
    story.append(Paragraph("Informasi Profil", st["section"]))

    created_at = getattr(detection, "created_at", datetime.now())
    date_str = created_at.strftime("%d %B %Y, %H:%M")

    info = [
        ["Nama Subjek", detection.name],
        ["Usia", f"{detection.age} tahun"],
        ["Gender", str(detection.gender).capitalize()],
        ["Nama Akun", user_name],
        ["Email", user_email],
        ["Tanggal", date_str],
    ]

    info_table = Table(info, colWidths=[100, doc.width - 100])
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(info_table)

    # ================= SUMMARY =================
    story.append(Paragraph("Ringkasan Kepribadian", st["section"]))
    story.append(
        Table(
            [[Paragraph(insights["summary"], st["body"])]],
            colWidths=[doc.width],
            style=[
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
                ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ],
        )
    )

    # ================= OVERVIEW =================
    story.append(Paragraph("Skor OCEAN", st["section"]))

    overview = [["Dimensi", "Skor", "Level"]]
    for t in TRAIT_LABELS:
        overview.append([TRAIT_LABELS[t], f"{scores[t]:.1f}%", get_level(scores[t]).capitalize()])

    overview_table = Table(overview, colWidths=[200, 100, doc.width - 300])
    overview_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("BACKGROUND", (0, 1), (-1, -1), LIGHT_BG),
            ]
        )
    )
    story.append(overview_table)

    # ================= DETAIL =================
    story.append(Paragraph("Analisis Detail", st["section"]))

    for trait in TRAIT_LABELS:
        story.append(Spacer(1, 10))

        header = Table(
            [[TRAIT_LABELS[trait], f"{scores[trait]:.1f}%"]],
            colWidths=[doc.width - 60, 60],
            style=[
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ],
        )
        story.append(header)
        story.append(score_bar(scores[trait], TRAIT_COLORS[trait], doc.width))
        story.append(Spacer(1, 6))
        story.append(Paragraph(insights[trait]["description"], st["body"]))

    # ================= FOOTER =================
    story.append(PageBreak())
    story.append(Paragraph(
        "Disclaimer: Laporan ini bersifat indikatif dan tidak menggantikan asesmen psikolog profesional.",
        st["muted"],
    ))
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"Laporan dibuat: {datetime.now().strftime('%d %B %Y, %H:%M:%S')}",
        st["footer"],
    ))
    story.append(Paragraph("OCEAN Personality Detection System", st["footer"]))

    doc.build(story)

    if output_path:
        buffer.seek(0)
        with open(output_path, "wb") as f:
            f.write(buffer.getvalue())

    buffer.seek(0)
    return buffer
