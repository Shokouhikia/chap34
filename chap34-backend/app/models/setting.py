from datetime import datetime

from sqlmodel import Field, SQLModel


class Setting(SQLModel, table=True):
    __tablename__ = "settings"

    key: str = Field(primary_key=True, max_length=100)
    value: str = Field(default="")
    is_secret: bool = Field(default=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


KEY_SMS_PROVIDER = "sms_provider"
KEY_SMS_API_KEY = "sms_api_key"
KEY_SMS_USERNAME = "sms_username"
KEY_SMS_PASSWORD = "sms_password"
KEY_GOOGLE_AI_API_KEY = "google_ai_api_key"
KEY_AI_PROVIDER = "ai_provider"  # "avalai" | "openai" - used by the photo generation pipeline
KEY_AVALAI_API_KEY = "avalai_api_key"
KEY_AVALAI_MODEL = "avalai_model"
KEY_ZARINPAL_MERCHANT_ID = "zarinpal_merchant_id"
KEY_BASE_URL = "base_url"

# --- SEO (site-wide, editable from /panel/admin/settings) ---
# Fallbacks only - per-page metadata (e.g. the homepage's own <title>) takes
# priority when it's set; these are what's left when nothing more specific
# exists. None of these are secrets: they're all meant to end up in public
# HTML/meta tags, so they're never masked by settings_service.mask().
KEY_SEO_SITE_TITLE = "seo_site_title"
KEY_SEO_SITE_DESCRIPTION = "seo_site_description"
KEY_SEO_DEFAULT_OG_IMAGE = "seo_default_og_image"
KEY_SEO_SITE_LOGO = "seo_site_logo"
KEY_SEO_GSC_VERIFICATION = "seo_gsc_verification"
KEY_SEO_GA_MEASUREMENT_ID = "seo_ga_measurement_id"
KEY_SEO_GTM_CONTAINER_ID = "seo_gtm_container_id"

KEY_PRICE_BASE_QTY_6 = "price_base_qty_6"
KEY_PRICE_BASE_QTY_12 = "price_base_qty_12"
KEY_PRICE_BASE_QTY_24 = "price_base_qty_24"
KEY_SIZE_MULTIPLIER_3X4 = "size_multiplier_3x4"
KEY_SIZE_MULTIPLIER_6X8 = "size_multiplier_6x8"
KEY_PAPER_MULTIPLIER_GLOSSY = "paper_multiplier_glossy"
KEY_PAPER_MULTIPLIER_MATTE = "paper_multiplier_matte"
KEY_SHIPPING_COST = "shipping_cost"

SECRET_KEYS = {
    KEY_SMS_API_KEY,
    KEY_SMS_PASSWORD,
    KEY_GOOGLE_AI_API_KEY,
    KEY_ZARINPAL_MERCHANT_ID,
    KEY_AVALAI_API_KEY,
}

# Curated AvalAI Gemini image models offered in the admin "هوش مصنوعی"
# picker. Both are proxied through AvalAI's OpenAI-compatible
# /v1/chat/completions endpoint (NOT /v1/images/edits, which only supports
# OpenAI's own image models) - see photo_generation.py's
# AVALAI_CHAT_COMPLETIONS_URL comment. Value is the exact model name AvalAI
# expects; label is what the admin sees.
AVALAI_MODEL_CHOICES = {
    "gemini-3.1-flash-lite-image": "Gemini 3.1 Flash Lite Image",
    "gemini-3.1-flash-image": "Gemini 3.1 Flash Image",
}
DEFAULT_AVALAI_MODEL = "gemini-3.1-flash-lite-image"

DEFAULT_SETTINGS = {
    KEY_SMS_PROVIDER: "kavenegar",
    KEY_SMS_API_KEY: "",
    KEY_SMS_USERNAME: "",
    KEY_SMS_PASSWORD: "",
    KEY_GOOGLE_AI_API_KEY: "",
    KEY_ZARINPAL_MERCHANT_ID: "",
    KEY_AI_PROVIDER: "avalai",
    KEY_AVALAI_API_KEY: "",
    KEY_AVALAI_MODEL: DEFAULT_AVALAI_MODEL,
    KEY_BASE_URL: "",
    KEY_PRICE_BASE_QTY_6: "400000",
    KEY_PRICE_BASE_QTY_12: "600000",
    KEY_PRICE_BASE_QTY_24: "800000",
    KEY_SIZE_MULTIPLIER_3X4: "1.0",
    KEY_SIZE_MULTIPLIER_6X8: "1.25",
    KEY_PAPER_MULTIPLIER_GLOSSY: "1.0",
    KEY_PAPER_MULTIPLIER_MATTE: "0.95",
    KEY_SHIPPING_COST: "45000",
    KEY_SEO_SITE_TITLE: "",
    KEY_SEO_SITE_DESCRIPTION: "",
    KEY_SEO_DEFAULT_OG_IMAGE: "",
    KEY_SEO_SITE_LOGO: "",
    KEY_SEO_GSC_VERIFICATION: "",
    KEY_SEO_GA_MEASUREMENT_ID: "",
    KEY_SEO_GTM_CONTAINER_ID: "",
}

# Public-safe subset of settings: keys the unauthenticated frontend is
# allowed to read (for metadata/JSON-LD/analytics tags). Never add a
# payment/SMS/AI-provider key here.
PUBLIC_SEO_KEYS = {
    KEY_BASE_URL,
    KEY_SEO_SITE_TITLE,
    KEY_SEO_SITE_DESCRIPTION,
    KEY_SEO_DEFAULT_OG_IMAGE,
    KEY_SEO_SITE_LOGO,
    KEY_SEO_GSC_VERIFICATION,
    KEY_SEO_GA_MEASUREMENT_ID,
    KEY_SEO_GTM_CONTAINER_ID,
}
