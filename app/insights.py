"""
OCEAN Personality Insight Generator

Template narasi insight untuk tiap dimensi OCEAN berdasarkan skor prediksi.
Threshold:
- High: >= 60%
- Medium: 40% - 59%
- Low: < 40%
"""

from typing import TypedDict


class InsightResult(TypedDict):
    level: str  # "high", "medium", "low"
    title: str
    description: str
    characteristics: list[str]
    suggestions: list[str]


class OceanInsights(TypedDict):
    openness: InsightResult
    conscientiousness: InsightResult
    extraversion: InsightResult
    agreeableness: InsightResult
    neuroticism: InsightResult
    summary: str


# Threshold definitions
HIGH_THRESHOLD = 60
MEDIUM_THRESHOLD = 40


def get_level(score: float) -> str:
    """Determine the level based on score threshold."""
    if score >= HIGH_THRESHOLD:
        return "high"
    elif score >= MEDIUM_THRESHOLD:
        return "medium"
    else:
        return "low"


# ============================================================================
# OPENNESS INSIGHTS
# ============================================================================
OPENNESS_INSIGHTS = {
    "high": InsightResult(
        level="high",
        title="Highly Open to Experience",
        description="Anda memiliki rasa ingin tahu yang tinggi dan terbuka terhadap ide-ide baru. Anda cenderung imajinatif, kreatif, dan menikmati pengalaman baru.",
        characteristics=[
            "Kreatif dan imajinatif",
            "Terbuka terhadap ide-ide baru",
            "Menikmati seni dan keindahan",
            "Suka mencoba hal-hal baru",
            "Berpikir abstrak dan filosofis",
        ],
        suggestions=[
            "Eksplorasi hobi kreatif seperti seni atau musik",
            "Coba pengalaman baru secara berkala",
            "Bergabung dengan komunitas yang mendorong inovasi",
            "Baca buku dari berbagai genre",
        ],
    ),
    "medium": InsightResult(
        level="medium",
        title="Moderately Open to Experience",
        description="Anda memiliki keseimbangan antara keterbukaan dan tradisi. Anda bisa menerima ide baru namun tetap menghargai pendekatan konvensional.",
        characteristics=[
            "Fleksibel dalam menerima ide baru",
            "Menghargai tradisi namun terbuka pada perubahan",
            "Praktis namun bisa kreatif saat diperlukan",
            "Seimbang antara inovasi dan stabilitas",
        ],
        suggestions=[
            "Cobalah sesekali keluar dari zona nyaman",
            "Eksplorasi minat baru secara bertahap",
            "Pertimbangkan sudut pandang berbeda dalam diskusi",
        ],
    ),
    "low": InsightResult(
        level="low",
        title="Practical and Conventional",
        description="Anda cenderung realistis dan lebih menyukai pendekatan yang sudah terbukti. Anda menghargai tradisi dan konsistensi.",
        characteristics=[
            "Praktis dan realistis",
            "Menyukai rutinitas dan stabilitas",
            "Fokus pada hal-hal konkret",
            "Menghargai tradisi dan konvensi",
            "Lebih suka pendekatan yang sudah teruji",
        ],
        suggestions=[
            "Tetap terbuka untuk perubahan kecil",
            "Pertimbangkan manfaat dari ide-ide baru",
            "Coba satu hal baru setiap bulan",
        ],
    ),
}

# ============================================================================
# CONSCIENTIOUSNESS INSIGHTS
# ============================================================================
CONSCIENTIOUSNESS_INSIGHTS = {
    "high": InsightResult(
        level="high",
        title="Highly Conscientious",
        description="Anda sangat terorganisir, disiplin, dan bertanggung jawab. Anda cenderung berorientasi pada tujuan dan dapat diandalkan.",
        characteristics=[
            "Sangat terorganisir dan rapi",
            "Disiplin dan bertanggung jawab",
            "Berorientasi pada tujuan",
            "Teliti dan detail-oriented",
            "Dapat diandalkan dan tepat waktu",
        ],
        suggestions=[
            "Jaga keseimbangan antara kerja dan istirahat",
            "Beri ruang untuk fleksibilitas",
            "Delegasikan tugas jika memungkinkan",
            "Hindari perfeksionisme berlebihan",
        ],
    ),
    "medium": InsightResult(
        level="medium",
        title="Moderately Conscientious",
        description="Anda memiliki keseimbangan antara struktur dan fleksibilitas. Anda bisa terorganisir namun juga adaptif.",
        characteristics=[
            "Cukup terorganisir",
            "Fleksibel dalam pendekatan",
            "Dapat fokus saat diperlukan",
            "Seimbang antara perencanaan dan spontanitas",
        ],
        suggestions=[
            "Tingkatkan perencanaan untuk proyek penting",
            "Gunakan tools organisasi sederhana",
            "Tetapkan deadline yang realistis",
        ],
    ),
    "low": InsightResult(
        level="low",
        title="Flexible and Spontaneous",
        description="Anda lebih santai dan spontan dalam pendekatan hidup. Anda menikmati fleksibilitas dan tidak terlalu terikat pada aturan ketat.",
        characteristics=[
            "Fleksibel dan adaptif",
            "Spontan dan easy-going",
            "Tidak terlalu terikat pada jadwal",
            "Menikmati kebebasan",
            "Terbuka pada perubahan rencana",
        ],
        suggestions=[
            "Pertimbangkan untuk membuat to-do list sederhana",
            "Tetapkan prioritas untuk tugas penting",
            "Gunakan reminder untuk deadline",
            "Coba teknik time-blocking",
        ],
    ),
}

# ============================================================================
# EXTRAVERSION INSIGHTS
# ============================================================================
EXTRAVERSION_INSIGHTS = {
    "high": InsightResult(
        level="high",
        title="Highly Extraverted",
        description="Anda sangat energik dan menikmati interaksi sosial. Anda cenderung optimis, asertif, dan mudah bergaul.",
        characteristics=[
            "Energik dan antusias",
            "Mudah bergaul dan ramah",
            "Menikmati keramaian dan aktivitas sosial",
            "Asertif dan percaya diri",
            "Optimis dan positif",
        ],
        suggestions=[
            "Manfaatkan kemampuan sosial untuk networking",
            "Jadi pemimpin dalam proyek tim",
            "Sisihkan waktu untuk refleksi diri",
            "Hargai kebutuhan introversi orang lain",
        ],
    ),
    "medium": InsightResult(
        level="medium",
        title="Ambivert",
        description="Anda memiliki keseimbangan antara sifat ekstrovert dan introvert. Anda bisa menikmati interaksi sosial namun juga membutuhkan waktu sendiri.",
        characteristics=[
            "Fleksibel dalam situasi sosial",
            "Dapat bersosialisasi namun perlu recharge",
            "Adaptif terhadap berbagai situasi",
            "Seimbang antara berbicara dan mendengar",
        ],
        suggestions=[
            "Kenali kapan Anda butuh bersosialisasi vs waktu sendiri",
            "Manfaatkan kedua sisi untuk berbagai situasi",
            "Jangan paksa diri untuk selalu on/off",
        ],
    ),
    "low": InsightResult(
        level="low",
        title="Introverted",
        description="Anda lebih menikmati waktu sendiri atau dalam kelompok kecil. Anda cenderung reflektif dan memproses pikiran secara internal.",
        characteristics=[
            "Reflektif dan thoughtful",
            "Menikmati kesendirian produktif",
            "Lebih suka percakapan mendalam",
            "Pendengar yang baik",
            "Lebih suka kelompok kecil",
        ],
        suggestions=[
            "Hargai kebutuhan akan waktu sendiri",
            "Fokus pada kualitas hubungan, bukan kuantitas",
            "Siapkan diri sebelum acara sosial besar",
            "Temukan cara bersosialisasi yang nyaman",
        ],
    ),
}

# ============================================================================
# AGREEABLENESS INSIGHTS
# ============================================================================
AGREEABLENESS_INSIGHTS = {
    "high": InsightResult(
        level="high",
        title="Highly Agreeable",
        description="Anda sangat kooperatif, empatik, dan peduli terhadap orang lain. Anda cenderung percaya pada kebaikan orang lain.",
        characteristics=[
            "Empatik dan pengertian",
            "Kooperatif dan suka membantu",
            "Percaya pada orang lain",
            "Menghindari konflik",
            "Ramah dan hangat",
        ],
        suggestions=[
            "Jaga batasan pribadi yang sehat",
            "Belajar mengatakan tidak bila perlu",
            "Pastikan kebutuhan diri juga terpenuhi",
            "Waspada terhadap manipulasi",
        ],
    ),
    "medium": InsightResult(
        level="medium",
        title="Balanced Cooperativeness",
        description="Anda memiliki keseimbangan antara kooperatif dan asertif. Anda bisa bekerja sama namun juga bisa memperjuangkan kepentingan sendiri.",
        characteristics=[
            "Kooperatif namun asertif",
            "Bisa percaya namun tetap waspada",
            "Fleksibel dalam negosiasi",
            "Seimbang antara memberi dan menerima",
        ],
        suggestions=[
            "Terus kembangkan empati",
            "Pertahankan keseimbangan yang ada",
            "Gunakan diplomasi dalam konflik",
        ],
    ),
    "low": InsightResult(
        level="low",
        title="Competitive and Skeptical",
        description="Anda cenderung lebih kompetitif dan skeptis. Anda memprioritaskan kepentingan diri dan tidak mudah percaya.",
        characteristics=[
            "Kompetitif dan ambisius",
            "Skeptis dan kritis",
            "Mandiri dan independen",
            "Tegas dalam menyatakan pendapat",
            "Tidak mudah dipengaruhi",
        ],
        suggestions=[
            "Pertimbangkan perspektif orang lain",
            "Kembangkan keterampilan kolaborasi",
            "Beri ruang untuk kepercayaan",
            "Latih empati dalam interaksi",
        ],
    ),
}

# ============================================================================
# NEUROTICISM INSIGHTS
# ============================================================================
NEUROTICISM_INSIGHTS = {
    "high": InsightResult(
        level="high",
        title="Emotionally Sensitive",
        description="Anda cenderung lebih sensitif terhadap stres dan emosi negatif. Anda mungkin mengalami fluktuasi mood yang lebih intens.",
        characteristics=[
            "Sensitif terhadap stres",
            "Mengalami emosi dengan intens",
            "Cenderung cemas atau khawatir",
            "Reaktif terhadap situasi sulit",
            "Deeply feeling dan emosional",
        ],
        suggestions=[
            "Praktikkan teknik relaksasi (meditasi, yoga)",
            "Bangun sistem support yang kuat",
            "Pertimbangkan journaling untuk emosi",
            "Jaga kesehatan fisik (tidur, olahraga)",
            "Cari bantuan profesional jika diperlukan",
        ],
    ),
    "medium": InsightResult(
        level="medium",
        title="Emotionally Balanced",
        description="Anda memiliki stabilitas emosional yang cukup. Anda bisa mengalami stres namun umumnya dapat mengatasinya.",
        characteristics=[
            "Cukup stabil secara emosional",
            "Dapat mengatasi stres umum",
            "Kadang cemas tapi bisa recover",
            "Seimbang dalam reaksi emosional",
        ],
        suggestions=[
            "Pertahankan kebiasaan sehat yang ada",
            "Kembangkan coping strategies",
            "Kenali trigger stres pribadi",
        ],
    ),
    "low": InsightResult(
        level="low",
        title="Emotionally Stable",
        description="Anda sangat stabil secara emosional dan tahan terhadap stres. Anda cenderung tenang dan tidak mudah terganggu.",
        characteristics=[
            "Sangat stabil dan tenang",
            "Tahan terhadap stres",
            "Tidak mudah cemas",
            "Konsisten dalam mood",
            "Resilient terhadap tekanan",
        ],
        suggestions=[
            "Tetap peka terhadap emosi sendiri",
            "Pahami bahwa orang lain mungkin lebih sensitif",
            "Gunakan ketenangan untuk membantu orang lain",
        ],
    ),
}


def get_trait_insight(trait: str, score: float) -> InsightResult:
    """Get insight for a specific OCEAN trait based on score."""
    level = get_level(score)

    trait_insights = {
        "openness": OPENNESS_INSIGHTS,
        "conscientiousness": CONSCIENTIOUSNESS_INSIGHTS,
        "extraversion": EXTRAVERSION_INSIGHTS,
        "agreeableness": AGREEABLENESS_INSIGHTS,
        "neuroticism": NEUROTICISM_INSIGHTS,
    }

    trait_lower = trait.lower()
    if trait_lower not in trait_insights:
        raise ValueError(f"Unknown trait: {trait}")

    return trait_insights[trait_lower][level]


def generate_summary(scores: dict[str, float]) -> str:
    """Generate a comprehensive personality summary based on all OCEAN scores."""
    summaries = []

    # Openness
    o_level = get_level(scores.get("openness", 50))
    if o_level == "high":
        summaries.append("terbuka terhadap pengalaman baru dan imajinatif")
    elif o_level == "low":
        summaries.append("praktis dan menghargai pendekatan konvensional")

    # Conscientiousness
    c_level = get_level(scores.get("conscientiousness", 50))
    if c_level == "high":
        summaries.append("terorganisir dan bertanggung jawab")
    elif c_level == "low":
        summaries.append("fleksibel dan spontan")

    # Extraversion
    e_level = get_level(scores.get("extraversion", 50))
    if e_level == "high":
        summaries.append("energik dan mudah bergaul")
    elif e_level == "low":
        summaries.append("reflektif dan menikmati waktu sendiri")

    # Agreeableness
    a_level = get_level(scores.get("agreeableness", 50))
    if a_level == "high":
        summaries.append("empatik dan kooperatif")
    elif a_level == "low":
        summaries.append("independen dan kompetitif")

    # Neuroticism
    n_level = get_level(scores.get("neuroticism", 50))
    if n_level == "high":
        summaries.append("sensitif dan merasakan emosi dengan intens")
    elif n_level == "low":
        summaries.append("tenang dan stabil secara emosional")

    if not summaries:
        return "Anda memiliki profil kepribadian yang seimbang di semua dimensi OCEAN."

    if len(summaries) == 1:
        return f"Berdasarkan analisis, Anda adalah seseorang yang {summaries[0]}."

    main_traits = ", ".join(summaries[:-1])
    last_trait = summaries[-1]
    return f"Berdasarkan analisis, Anda adalah seseorang yang {main_traits}, dan {last_trait}."


def generate_ocean_insights(scores: dict[str, float]) -> OceanInsights:
    """
    Generate complete OCEAN insights based on prediction scores.

    Args:
        scores: Dictionary with OCEAN trait names and their scores (0-100)
                Keys can be capitalized (Openness) or lowercase (openness)

    Returns:
        OceanInsights dictionary with insights for each trait and overall summary
    """
    # Normalize keys to lowercase
    normalized_scores = {k.lower(): v for k, v in scores.items()}

    return OceanInsights(
        openness=get_trait_insight("openness", normalized_scores.get("openness", 50)),
        conscientiousness=get_trait_insight(
            "conscientiousness", normalized_scores.get("conscientiousness", 50)
        ),
        extraversion=get_trait_insight(
            "extraversion", normalized_scores.get("extraversion", 50)
        ),
        agreeableness=get_trait_insight(
            "agreeableness", normalized_scores.get("agreeableness", 50)
        ),
        neuroticism=get_trait_insight(
            "neuroticism", normalized_scores.get("neuroticism", 50)
        ),
        summary=generate_summary(normalized_scores),
    )


def get_insight_for_detection(detection) -> OceanInsights:
    """
    Generate insights from a Detection model instance.

    Args:
        detection: Detection model instance with OCEAN scores

    Returns:
        OceanInsights dictionary
    """
    scores = {
        "openness": detection.openness,
        "conscientiousness": detection.conscientiousness,
        "extraversion": detection.extraversion,
        "agreeableness": detection.agreeableness,
        "neuroticism": detection.neuroticism,
    }
    return generate_ocean_insights(scores)
