"""The 20 languages a consultation can be spoken in and notes can be written in.

Codes are ISO 639-1 ("ur"). `locale` is the speech locale for Azure Speech / the browser's live captions.
"""

# code: (English name, speech locale, how the language is written)
LANGUAGES: dict[str, tuple[str, str, str]] = {
    "en": ("English", "en-US", "Latin script"),
    "ur": ("Urdu", "ur-PK", "Urdu (Nastaliq / Perso-Arabic) script, not Roman Urdu"),
    "ar": ("Arabic", "ar-SA", "Arabic script"),
    "es": ("Spanish", "es-ES", "Latin script"),
    "fr": ("French", "fr-FR", "Latin script"),
    "sv": ("Swedish", "sv-SE", "Latin script"),
    "de": ("German", "de-DE", "Latin script"),
    "it": ("Italian", "it-IT", "Latin script"),
    "pt": ("Portuguese", "pt-BR", "Latin script"),
    "ru": ("Russian", "ru-RU", "Cyrillic script"),
    "zh": ("Chinese (Simplified)", "zh-CN", "simplified Chinese characters"),
    "ja": ("Japanese", "ja-JP", "Japanese script (kanji and kana)"),
    "ko": ("Korean", "ko-KR", "Hangul"),
    "hi": ("Hindi", "hi-IN", "Devanagari script"),
    "bn": ("Bengali", "bn-IN", "Bengali script"),
    "tr": ("Turkish", "tr-TR", "Latin script"),
    "fa": ("Persian (Farsi)", "fa-IR", "Persian (Perso-Arabic) script"),
    "id": ("Indonesian", "id-ID", "Latin script"),
    "nl": ("Dutch", "nl-NL", "Latin script"),
    "pl": ("Polish", "pl-PL", "Latin script"),
}
CODES = tuple(LANGUAGES)
AUTO = "auto"  # conversation language: let the transcriber find out
SAME = "same"  # notes language: same as the conversation

# Heading of the summary in a downloaded Word file
SUMMARY_LABEL = {
    "en": "Summary", "ur": "خلاصہ", "ar": "الملخص", "es": "Resumen", "fr": "Résumé", "sv": "Sammanfattning",
    "de": "Zusammenfassung", "it": "Riepilogo", "pt": "Resumo", "ru": "Краткое содержание", "zh": "摘要",
    "ja": "概要", "ko": "요약", "hi": "सारांश", "bn": "সারসংক্ষেপ", "tr": "Özet", "fa": "خلاصه",
    "id": "Ringkasan", "nl": "Samenvatting", "pl": "Podsumowanie",
}
CODES_LABEL = {
    "en": "Diagnostic codes", "ur": "تشخیصی کوڈز", "ar": "رموز التشخيص", "es": "Códigos diagnósticos",
    "fr": "Codes diagnostiques", "sv": "Diagnoskoder", "de": "Diagnosecodes", "it": "Codici diagnostici",
    "pt": "Códigos de diagnóstico", "ru": "Диагностические коды", "zh": "诊断代码", "ja": "診断コード",
    "ko": "진단 코드", "hi": "निदान कोड", "bn": "রোগনির্ণয় কোড", "tr": "Tanı kodları", "fa": "کدهای تشخیصی",
    "id": "Kode diagnosis", "nl": "Diagnosecodes", "pl": "Kody diagnostyczne",
}
RTL = {"ar", "ur", "fa"}


def normalize(value: str | None) -> str | None:
    """"ur", "UR", "ur-PK" -> "ur"; unknown or empty -> None."""
    code = (value or "").strip().lower().replace("_", "-").split("-")[0]
    return code if code in LANGUAGES else None


def name(code: str | None) -> str:
    return LANGUAGES[code][0] if code in LANGUAGES else "English"


def script(code: str | None) -> str:
    return LANGUAGES[code][2] if code in LANGUAGES else "Latin script"


def locale(code: str | None, fallback: str = "en-US") -> str:
    return LANGUAGES[code][1] if code in LANGUAGES else fallback
