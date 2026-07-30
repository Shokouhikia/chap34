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
| تشخیص جنسیت | همیشه تصادفی (مرد/زن) با اطمینان ساختگی | مدل واقعی (مثلاً InsightFace `buffalo_l`) |
| تولید عکس نهایی | فقط عکس اصلی را کپی می‌کند | پایپ‌لاین واقعی تعویض پوشش/پس‌زمینه (احتمالاً async) |
| کد تأیید (OTP) | همیشه `1234` است، پیامکی ارسال نمی‌شود | اتصال به کاوه‌نگار/غزال/فراپیامک |
| توکن ورود | صرفاً UUID کاربر به‌صورت متن ساده | JWT امضاشده |
| پرداخت | `init`/`callback` بین خودمونه، درگاه واقعی نیست | زرین‌پال یا آیدی‌پی |
| قیمت‌گذاری | ماتریس واقعی سرور محاسبه می‌کنه (این بخش دیگه فیک نیست) | — |

## نکته امنیتی مهم

قیمت سفارش **همیشه سمت سرور** از روی ماتریس `app/core/pricing.py`
محاسبه می‌شه، نه از روی چیزی که فرانت می‌فرسته. فرانت فقط برای پیش‌نمایش
قیمت زنده از `GET /api/print/pricing` استفاده می‌کنه.
