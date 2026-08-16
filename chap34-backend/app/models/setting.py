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
KEY_AI_PROVIDER = "ai_provider"  # "openrouter" | "openai" - used by the photo generation pipeline
KEY_OPENROUTER_API_KEY = "openrouter_api_key"
KEY_OPENROUTER_MODEL = "openrouter_model"
KEY_ZARINPAL_MERCHANT_ID = "zarinpal_merchant_id"
KEY_BASE_URL = "base_url"

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
    KEY_OPENROUTER_API_KEY,
}

# Curated OpenRouter models offered in the admin "هوش مصنوعی" picker. Value
# is the exact OpenRouter model slug sent as `model` in the /api/v1/images
# request; label is what the admin sees.
OPENROUTER_MODEL_CHOICES = {
    "google/gemini-2.5-flash-image": "Nano Banana (Gemini 2.5 Flash Image)",
    "google/gemini-3.1-flash-lite-image": "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
    "bytedance/seedance-2.5": "Seedance 2.5 (ByteDance) — عمدتاً مدل ویدیو، ممکن است ادیت عکس ثابت را پشتیبانی نکند",
}
DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash-image"

DEFAULT_SETTINGS = {
    KEY_SMS_PROVIDER: "kavenegar",
    KEY_SMS_API_KEY: "",
    KEY_SMS_USERNAME: "",
    KEY_SMS_PASSWORD: "",
    KEY_GOOGLE_AI_API_KEY: "",
    KEY_ZARINPAL_MERCHANT_ID: "",
    KEY_AI_PROVIDER: "openrouter",
    KEY_OPENROUTER_API_KEY: "",
    KEY_OPENROUTER_MODEL: DEFAULT_OPENROUTER_MODEL,
    KEY_BASE_URL: "",
    KEY_PRICE_BASE_QTY_6: "400000",
    KEY_PRICE_BASE_QTY_12: "600000",
    KEY_PRICE_BASE_QTY_24: "800000",
    KEY_SIZE_MULTIPLIER_3X4: "1.0",
    KEY_SIZE_MULTIPLIER_6X8: "1.25",
    KEY_PAPER_MULTIPLIER_GLOSSY: "1.0",
    KEY_PAPER_MULTIPLIER_MATTE: "0.95",
    KEY_SHIPPING_COST: "45000",
}
