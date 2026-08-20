---
title: Chap34 Backend
emoji: 🖨️
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# Chap34 — Backend (FastAPI)

## ⚠️ مهم: اگه قبلاً یک‌بار migration ساختی

مدل‌های `Photo` و `Order` این‌بار به‌طور کامل عوض شدن (فیلدهای جنسیت/پوشش/
پس‌زمینه به Photo اضافه شد، فیلدهای Order برای سایز و قیمت‌گذاری جدید
تغییر کرد). چون این هنوز یک پروژه دموئه و داده مهمی توش نیست، ساده‌ترین
راه اینه که از صفر شروع کنی:

```powershell
# فایل migration قدیمی رو پاک کن
Remove-Item alembic\versions\*.py

# دیتابیس رو کاملاً ریست کن
docker compose down -v
docker compose up -d

# migration جدید بساز و اجرا کن
alembic revision --autogenerate -m "add gender/outfit fields and print pricing"
alembic upgrade head
```

یادت نره طبق مشکل قبلی، بعد از autogenerate چک کنی که `import sqlmodel`
بالای فایل migration ساخته‌شده هست (`script.py.mako` این‌بار خودش
اضافه‌اش می‌کنه).

## راه‌اندازی اولیه (از صفر)

```bash
python3 -m venv .venv
source .venv/bin/activate      # ویندوز: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d
alembic revision --autogenerate -m "initial"
alembic upgrade head
uvicorn app.main:app --reload
```

بعد از اجرا:
- API: http://localhost:8000
- مستندات تعاملی (Swagger): http://localhost:8000/docs

## جریان کامل و endpoint های هر مرحله

```
capture        → POST /api/photo/upload
processing     → POST /api/photo/{id}/detect-gender
genderSettings → (فقط UI - کاربر پوشش/پس‌زمینه انتخاب می‌کند)
generating     → POST /api/photo/{id}/generate
result         → GET  /api/photo/{id}
phone          → POST /api/auth/send-otp
otp            → POST /api/auth/verify-otp
printOptions   → GET  /api/print/pricing  (برای نمایش قیمت زنده)
address+summary→ POST /api/orders  (آدرس این‌جا inline ارسال می‌شود)
پرداخت         → POST /api/payment/init  سپس  POST /api/payment/callback
tracking       → GET  /api/orders/{id}/status
                 POST /api/orders/{id}/advance  (فقط دمو - جلو بردن دستی وضعیت)
```

## چیزهایی که در این نسخه دمو فیک هستند

هر جای کد که این‌طور فیک شده، با یک کامنت `DEMO NOTE` مشخص شده:

| بخش | وضعیت فعلی | باید جایگزین شود با |
|---|---|---|
| تشخیص جنسیت | واقعی، ولی سمت کلاینت (مرورگر، face-api.js) قبل از آپلود انجام می‌شه؛ بک‌اند فقط مقدار ارسالی رو ذخیره می‌کنه | — (دیگه فیک نیست) |
| تولید عکس نهایی | پس‌زمینه واقعاً از طریق OpenAI Images API عوض می‌شه و کراپ ۳:۴ دقیق اعمال می‌شه | تعویض پوشش (`outfit_type`) هنوز پیاده نشده - نیاز به مدل مولد داره |
| کد تأیید (OTP) | همیشه `1234` است، پیامکی ارسال نمی‌شود | اتصال به کاوه‌نگار/غزال/فراپیامک |
| توکن ورود | صرفاً UUID کاربر به‌صورت متن ساده | JWT امضاشده |
| پرداخت | `init`/`callback` بین خودمونه، درگاه واقعی نیست | زرین‌پال یا آیدی‌پی |
| قیمت‌گذاری | ماتریس واقعی سرور محاسبه می‌کنه (این بخش دیگه فیک نیست) | — |

## نکته امنیتی مهم

قیمت سفارش **همیشه سمت سرور** از روی ماتریس `app/core/pricing.py`
محاسبه می‌شه، نه از روی چیزی که فرانت می‌فرسته. فرانت فقط برای پیش‌نمایش
قیمت زنده از `GET /api/print/pricing` استفاده می‌کنه.

## پنل آتلیه و پنل عملیاتی چاپخانه (مدیریت سفارش، چاپ و ارسال)

این فاز دو پنل داخلی اضافه می‌کنه که چرخه‌ی سفارش رو از لحظه‌ی پرداخت تا
تحویل به مشتری مدیریت می‌کنن. برخلاف مسیر مشتری، احراز هویت این‌جا **واقعیه**
(JWT امضاشده + bcrypt) — `app/core/security.py`.

- فیلد `Order.status` (مسیر مشتری) دست‌نخورده مونده. یک فیلد جدید
  `Order.fulfillment_status` چرخه‌ی **۱۱ مرحله‌ای** عملیاتی رو نگه می‌داره؛
  نگاشت به **۶ مرحله‌ی** نمایشی در `app/services/status_mapping.py` (تابع
  خالص، تنها منبع این نگاشت). مراحل QC و تفکیک قبلاً حذف شدن.
- تولید شیت چاپ / برچسب پستی / لیست تحویل به پست همه سمت سرور با Pillow
  انجام می‌شه (`app/services/sheet_layout.py`, `labels.py`, `rendering.py`)،
  QR داخلی با پکیج `qrcode`. خروجی PNG یا PDF چندصفحه‌ای (بدون reportlab —
  یک مسیر رندر واحد برای متن فارسی با reshaper + bidi).

### راه‌اندازی این فاز

```powershell
pip install -r requirements.txt          # PyJWT, qrcode, bcrypt, arabic-reshaper, python-bidi
alembic upgrade head                      # migration جدید b381e25f90d3
python -m scripts.seed_demo               # حساب‌های دمو + چند سفارش نمونه
```

migration جدید داده‌ی موجود رو نمی‌شکنه: `order_code` برای ردیف‌های قدیمی
backfill می‌شه و `fulfillment_status` با دیفالت `registered` پر می‌شه.

### حساب‌های دمو (بعد از seed)

| نقش | نام کاربری | رمز |
|---|---|---|
| آتلیه | `atelier1` | `demo1234` |
| مدیر | `admin` | `demo1234` |

پنل هر دو نقش در فرانت: **`/panel/login`** (پنل‌های جدا `/atelier` و `/ops`
حذف شدن و همه زیر `/panel/...` یکپارچه شدن).

### نقش‌ها و دسترسی

`StaffRole` فقط دو مقدار داره: `ADMIN` و `ATELIER`. تابع
`require_staff_role(*roles)` در `app/api/deps.py` دسترسی رو با **عضویت در
مجموعه** چک می‌کنه، نه سلسله‌مراتب — یعنی توکن ادمین به‌طور خودکار جایی که
نقش آتلیه لازمه پذیرفته **نمی‌شه**. هر endpointی که باید برای هر دو نقش باز
باشه، هر دو رو صراحتاً لیست می‌کنه تا دامنه‌ی این بازکردن عمدی و قابل‌دیدن
بمونه.

در عمل: کل `/api/ops/*` فقط آتلیه‌ست، به‌جز دو endpoint گزارش
(`/api/ops/orders/report` و `.csv`) که ادمین هم بهشون دسترسی داره.

### فرآیند چاپ

۱. لیست سفارش‌ها **FIFO** (قدیمی‌ترین اول). سفارشی که وارد بچ شده
به‌صورت پیش‌فرض از این لیست حذف می‌شه (`exclude_batched`).
۲. ساخت بچ، سایز چاپ و جنس کاغذ **یکسان** رو اجبار می‌کنه — یک بچ یعنی یک
ران فیزیکی چاپ.
۳. اندازه‌ی برگ خودکار از روی سایز چاپ انتخاب می‌شه: ۶×۸ روی ۱۰×۱۵ فقط
**۱ قطعه** در هر برگ جا می‌شه در برابر **۹ قطعه** روی A4.
۴. در بخش بچ دو خروجی جدا گرفته می‌شه: **شیت عکس‌ها** و **برچسب آدرس‌ها**.
هر دو از `_batch_orders()` می‌آن که `ORDER BY` قطعی داره، پس ترتیبشون
تضمین‌شده یکیه و اِن‌اُمین بلاک بریده‌شده با اِن‌اُمین برچسب جفت می‌شه.

### DEMO NOTE های این فاز (تصمیم‌های مستندشده)

- **bcrypt مستقیم به‌جای passlib**: passlib 1.7.4 با bcrypt ≥۴.۱ نصب‌شده
  کرش می‌کنه، پس در `security.py` مستقیم از API خود `bcrypt` استفاده شده.
- **رد کنترل کیفیت** سفارش رو به وضعیت `qc_rejected` می‌بره (نه مستقیم
  `queued`)؛ این سفارش‌ها دوباره از `POST /api/ops/batches` قابل بچ‌شدن‌اند.
- **اتمام چاپِ بچ** سفارش‌ها رو مستقیم به `qc_pending` می‌بره تا صف کنترل
  کیفیت بدون یک کلیک اضافه پر بشه.
- **تخصیص آتلیه** دستی است: `PATCH /api/ops/orders/{id}/assign-atelier`
  (اتوماسیون round-robin خارج از این فاز).
- **نقش اپراتور** فعلاً enforce نمی‌شه جز برای اندپوینت‌های ادمین
  (`/api/admin/ateliers`).
