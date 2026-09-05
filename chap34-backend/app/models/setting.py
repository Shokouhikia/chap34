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

# --- Business info (contact/legal/notifications) - editable from
# /panel/admin/business-info. Legal text values are long-form (HTML/plain
# text authored by the admin) and stored as-is; frontend renders them
# whitespace-preserved, never as raw HTML, to avoid an admin-side XSS vector.
KEY_BIZ_PHONE = "biz_phone"
KEY_BIZ_EMAIL = "biz_email"
KEY_BIZ_ADDRESS = "biz_address"
KEY_BIZ_INSTAGRAM = "biz_instagram"

KEY_SMTP_HOST = "smtp_host"
KEY_SMTP_PORT = "smtp_port"
KEY_SMTP_USERNAME = "smtp_username"
KEY_SMTP_PASSWORD = "smtp_password"
KEY_SMTP_FROM_EMAIL = "smtp_from_email"

# Which configured gateway /api/payment/init uses. Only "zarinpal" has a
# real implementation (see app.services.zarinpal) - kept as a setting
# rather than hardcoded so switching gateways later doesn't need a
# code change, but selecting anything else currently just errors clearly.
KEY_PAYMENT_GATEWAY = "payment_gateway"

# --- SMS.ir (https://sms.ir) - the SMS provider going forward. Kept
# alongside the older Kavenegar-shaped keys (KEY_SMS_*) rather than
# replacing them: app.services.sms_service dispatches to whichever is
# enabled, with Kavenegar as the fallback if SMS.ir is off. See
# /panel/admin/business-info "SMS.ir" tab.
KEY_SMSIR_ENABLED = "smsir_enabled"
KEY_SMSIR_API_KEY = "smsir_api_key"
KEY_SMSIR_LINE_NUMBER = "smsir_line_number"
KEY_SMSIR_OTP_TEMPLATE_ID = "smsir_otp_template_id"
# Per-notification-type toggles, independent of which provider is active.
KEY_SMSIR_NOTIFY_ORDER_PLACED = "smsir_notify_order_placed"
KEY_SMSIR_NOTIFY_STATUS_CHANGE = "smsir_notify_status_change"
KEY_SMSIR_NOTIFY_PAYMENT_CONFIRMED = "smsir_notify_payment_confirmed"

KEY_LEGAL_ABOUT = "legal_about"
KEY_LEGAL_TERMS = "legal_terms"
KEY_LEGAL_PRIVACY = "legal_privacy"
KEY_LEGAL_USER_CONTENT_TERMS = "legal_user_content_terms"
KEY_LEGAL_REFUND_POLICY = "legal_refund_policy"

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
    KEY_SMTP_PASSWORD,
    KEY_SMSIR_API_KEY,
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

# Default legal-page bodies. These are an AI-drafted starting point, not
# reviewed legal text - the admin must read, adjust to the business's real
# practices and have them checked before relying on them for Enamad or any
# other compliance purpose. Editable from /panel/admin/business-info.
DEFAULT_ABOUT_TEXT = """چاپ۳۴ (Chap34) یک سرویس آنلاین است که با استفاده از هوش مصنوعی، از روی عکسی که کاربر می‌گیرد یا آپلود می‌کند، یک عکس پرسنلی استاندارد (سایز ۳×۴ یا ۶×۸) تولید می‌کند. کاربر می‌تواند فایل نهایی را دانلود کند یا سفارش چاپ و ارسال پستی آن را ثبت کند.

هدف ما ساده و سریع‌کردن فرآیند تهیه‌ی عکس پرسنلی استاندارد است، بدون نیاز به مراجعه‌ی حضوری به آتلیه و صرف زمان برای گرفتن عکس با کیفیت مناسب.

این متن یک پیش‌نویس اولیه است و باید با اطلاعات واقعی کسب‌وکار (تاریخچه، مجوزها، آدرس و غیره) توسط مدیر سایت تکمیل شود."""

DEFAULT_TERMS_TEXT = """۱. با ثبت سفارش در چاپ۳۴، کاربر می‌پذیرد که مشخصات وارد‌شده (آدرس، شماره تماس) صحیح و متعلق به خود اوست.

۲. قیمت نهایی هر سفارش (شامل هزینه‌ی چاپ و هزینه‌ی ارسال) پیش از پرداخت به‌طور کامل و شفاف به کاربر نمایش داده می‌شود و پس از پرداخت تغییر نمی‌کند.

۳. پرداخت از طریق درگاه بانکی معتبر و متصل به شاپرک انجام می‌شود؛ اطلاعات کارت بانکی کاربر در هیچ مرحله‌ای توسط چاپ۳۴ دریافت یا ذخیره نمی‌شود.

۴. کیفیت عکس نهایی به کیفیت عکس ارسالی توسط کاربر (نور، وضوح، زاویه) وابسته است.

۵. زمان تقریبی آماده‌سازی، چاپ و ارسال سفارش در فرآیند ثبت سفارش و صفحه‌ی پیگیری اعلام می‌شود.

۶. برای اطلاعات مربوط به لغو سفارش و بازگشت وجه به صفحه‌ی «قوانین لغو سفارش و بازگشت وجه» مراجعه کنید.

۷. برای اطلاعات مربوط به نحوه‌ی استفاده از تصاویر آپلودی، به صفحه‌ی «شرایط استفاده از تصاویر کاربران» مراجعه کنید.

این متن یک پیش‌نویس اولیه است و پیش از انتشار نهایی باید توسط مدیر سایت یا مشاور حقوقی بازبینی شود."""

DEFAULT_PRIVACY_TEXT = """چاپ۳۴ برای ارائه‌ی خدمات خود اطلاعات زیر را از کاربران دریافت می‌کند:

- شماره موبایل (برای ورود به حساب کاربری و اطلاع‌رسانی سفارش)
- عکس آپلودی یا گرفته‌شده توسط کاربر (برای تولید عکس پرسنلی)
- آدرس پستی و شماره تماس گیرنده (در صورت ثبت سفارش چاپ، برای ارسال مرسوله)

این اطلاعات صرفاً برای موارد زیر استفاده می‌شود:
- پردازش و تولید عکس پرسنلی
- ثبت، پیگیری و ارسال سفارش
- اطلاع‌رسانی وضعیت سفارش از طریق پیامک

اطلاعات کاربران در اختیار اشخاص ثالث قرار نمی‌گیرد، مگر در حد ضرورت برای انجام خدمت (مانند شرکت پست برای ارسال مرسوله، درگاه پرداخت برای انجام تراکنش، یا سرویس پیامکی برای اطلاع‌رسانی).

برای سیاست نگهداری و حذف تصاویر آپلودی، به صفحه‌ی «شرایط استفاده از تصاویر کاربران» مراجعه کنید.

این متن یک پیش‌نویس اولیه است و باید پیش از انتشار نهایی توسط مدیر سایت بازبینی و در صورت نیاز توسط مشاور حقوقی تأیید شود."""

DEFAULT_USER_CONTENT_TERMS_TEXT = """عکسی که کاربر در چاپ۳۴ آپلود می‌کند یا با دوربین می‌گیرد، صرفاً برای موارد زیر استفاده می‌شود:

- پردازش توسط هوش مصنوعی جهت تولید عکس پرسنلی استاندارد
- نمایش نتیجه به خود کاربر جهت تأیید یا ویرایش
- در صورت ثبت سفارش چاپ، ارسال فایل به چاپخانه‌ی همکار جهت چاپ فیزیکی

عکس‌های آپلودی کاربران:
- بدون اجازه‌ی صریح کاربر در تبلیغات، نمونه‌کار یا هیچ مکان عمومی دیگری منتشر نمی‌شود.
- برای آموزش مدل‌های هوش مصنوعی استفاده نمی‌شود.
- پس از تکمیل سفارش (یا در صورت عدم تکمیل، پس از یک دوره‌ی مشخص عدم فعالیت) از سرورهای ما حذف می‌شود؛ مدت دقیق نگهداری باید توسط مدیر سایت مشخص و در همین صفحه اعلام شود.

کاربر مسئول این است که تصویری که آپلود می‌کند متعلق به خودش (یا فردی باشد که او مجاز به ارسال تصویرش است) و ناقض حقوق اشخاص ثالث نباشد.

این متن یک پیش‌نویس اولیه است. مدت دقیق نگهداری تصاویر و جزئیات فنی حذف آن‌ها باید توسط مدیر سایت تکمیل و تأیید شود."""

DEFAULT_REFUND_POLICY_TEXT = """۱. لغو پیش از شروع چاپ: تا پیش از آنکه سفارش وارد مرحله‌ی چاپ شود، امکان لغو سفارش و بازگشت کامل وجه پرداختی وجود دارد. برای لغو با پشتیبانی از طریق راه‌های ارتباطی مندرج در صفحه‌ی «تماس با ما» در تماس باشید.

۲. لغو پس از شروع چاپ: از آنجا که هر سفارش بر اساس عکس شخصی کاربر و به‌صورت اختصاصی چاپ می‌شود، پس از شروع فرآیند چاپ امکان لغو سفارش وجود ندارد.

۳. مغایرت یا نقص در سفارش: در صورتی که سفارش دریافتی دارای نقص چاپی، آسیب در حمل، یا مغایرت با سفارش ثبت‌شده باشد، کاربر می‌تواند حداکثر تا (مدت زمان مشخص توسط مدیر سایت) پس از دریافت مرسوله موضوع را به پشتیبانی اطلاع دهد تا نسبت به چاپ مجدد یا بازگشت وجه اقدام شود.

۴. زمان بازگشت وجه: در صورت تأیید بازگشت وجه، مبلغ ظرف مدت ۷ تا ۱۴ روز کاری به همان کارت/حساب مبدأ پرداخت بازگردانده می‌شود.

۵. تماس با پشتیبانی: برای هرگونه درخواست لغو یا بازگشت وجه، از طریق صفحه‌ی «تماس با ما» یا فرم پیگیری سفارش با ما در ارتباط باشید.

این متن یک پیش‌نویس اولیه است؛ مهلت‌های دقیق و شرایط استثنا باید توسط مدیر سایت بازبینی و نهایی شود."""


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
    KEY_BIZ_PHONE: "",
    KEY_BIZ_EMAIL: "",
    KEY_BIZ_ADDRESS: "",
    KEY_BIZ_INSTAGRAM: "https://instagram.com/chap34",
    KEY_SMTP_HOST: "",
    KEY_SMTP_PORT: "587",
    KEY_SMTP_USERNAME: "",
    KEY_SMTP_PASSWORD: "",
    KEY_SMTP_FROM_EMAIL: "",
    KEY_PAYMENT_GATEWAY: "zarinpal",
    KEY_SMSIR_ENABLED: "false",
    KEY_SMSIR_API_KEY: "",
    KEY_SMSIR_LINE_NUMBER: "",
    KEY_SMSIR_OTP_TEMPLATE_ID: "",
    KEY_SMSIR_NOTIFY_ORDER_PLACED: "true",
    KEY_SMSIR_NOTIFY_STATUS_CHANGE: "true",
    KEY_SMSIR_NOTIFY_PAYMENT_CONFIRMED: "true",
    KEY_LEGAL_ABOUT: DEFAULT_ABOUT_TEXT,
    KEY_LEGAL_TERMS: DEFAULT_TERMS_TEXT,
    KEY_LEGAL_PRIVACY: DEFAULT_PRIVACY_TEXT,
    KEY_LEGAL_USER_CONTENT_TERMS: DEFAULT_USER_CONTENT_TERMS_TEXT,
    KEY_LEGAL_REFUND_POLICY: DEFAULT_REFUND_POLICY_TEXT,
}

# Public-safe subset for the customer-facing site: contact info + legal
# page bodies. Never add SMTP/payment credentials here.
PUBLIC_CONTENT_KEYS = {
    KEY_BIZ_PHONE,
    KEY_BIZ_EMAIL,
    KEY_BIZ_ADDRESS,
    KEY_BIZ_INSTAGRAM,
    KEY_LEGAL_ABOUT,
    KEY_LEGAL_TERMS,
    KEY_LEGAL_PRIVACY,
    KEY_LEGAL_USER_CONTENT_TERMS,
    KEY_LEGAL_REFUND_POLICY,
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
