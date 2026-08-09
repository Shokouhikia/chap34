# دیپلوی رایگان (فعلاً): Vercel + Neon + Hugging Face Spaces

سه بخش پروژه روی سه سرویس رایگان جدا می‌رن. هر سه فقط از طریق داشبورد
خودشون (با لاگین گیت‌هاب) قابل‌راه‌اندازی‌ان — این مراحل رو باید خودتون
انجام بدید چون نیاز به ساخت اکانت داره.

## ۱. دیتابیس — Neon (Postgres رایگان)

1. برو [neon.tech](https://neon.tech) → با گیت‌هاب لاگین کن → **New Project**
2. یه نام بذار (مثلاً `chap34`) و ریجن رو انتخاب کن
3. از تب **Connection Details**، رشته‌ی اتصال رو کپی کن — چیزی شبیه:
   ```
   postgresql://user:pass@ep-xxxx.region.aws.neon.tech/chap34?sslmode=require
   ```
4. پیشوندش رو به `postgresql+psycopg2://` عوض کن (کد از psycopg2 استفاده
   می‌کنه) — این مقدار نهایی می‌شه `DATABASE_URL` که تو مرحله‌ی ۲ لازمش داری.

## ۲. بک‌اند — Hugging Face Spaces (Docker، رایگان با ۲ vCPU / ۱۶GB RAM)

### ساخت Space
1. برو [huggingface.co/new-space](https://huggingface.co/new-space) → لاگین با گیت‌هاب
2. اسم Space رو بذار (مثلاً `chap34-backend`)، **SDK** رو `Docker` انتخاب کن، **Visibility** هرچی خواستی
3. بعد از ساخته‌شدن، بدون این‌که کاری کنی، برو تو تب **Settings** همون Space → بخش **Variables and secrets** → این‌ها رو اضافه کن:
   - `DATABASE_URL` = همون مقداری که از Neon گرفتی (secret)
   - `SECRET_KEY` = یه رشته‌ی رندوم امن (secret)
   - `ADMIN_USER` / `ADMIN_PASS` = یوزر/پس ادمین اولیه (secret)
   - `ENVIRONMENT` = `production`

### وصل‌کردن به گیت‌هاب برای دیپلوی خودکار
فایل `.github/workflows/deploy-hf-space.yml` از قبل تو ریپو آماده‌ست و با
هر push به `main` که `chap34-backend/` رو عوض کنه، خودکار محتوای اون
پوشه رو به Space پوش می‌کنه (Space با گرفتن پوش، ایمیج رو خودش rebuild
می‌کنه). فقط باید یه بار این‌ها رو تو تنظیمات ریپوی گیت‌هاب ست کنی:

1. برو [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → **New token** → دسترسی **Write** بده → کپی کن
2. تو ریپوی گیت‌هاب: **Settings → Secrets and variables → Actions**
   - تب **Secrets** → New repository secret:
     - `HF_TOKEN` = همون توکنی که ساختی
   - تب **Variables** → New repository variable:
     - `HF_USERNAME` = یوزرنیم حساب Hugging Face‌ت
     - `HF_SPACE_NAME` = اسمی که برای Space گذاشتی (مثلاً `chap34-backend`)
3. یه push خالی به `main` بزن (یا از تب Actions روی این workflow دستی **Run workflow** بزن) — بعد از چند دقیقه Space باید بیلد و آپ بشه.

آدرس نهایی بک‌اند: `https://<HF_USERNAME>-<HF_SPACE_NAME>.hf.space`

⚠️ **محدودیت‌های این تیر رایگان**: بعد از مدتی بی‌کاری، Space می‌خوابه (کولد
استارت چند ده‌ثانیه‌ای موقع اولین درخواست بعدی)، و دیسکش ephemeral هست —
یعنی عکس‌های آپلودشده (`app/static/uploads`) با هر sleep/rebuild پاک
می‌شن. برای دمو/تست مشکلی نیست؛ برای واقعی‌شدن باید storage رو به یه
Object Storage (S3 و مشابه) وصل کنیم.

## ۳. فرانت‌اند — Vercel (رایگان)

1. برو [vercel.com/new](https://vercel.com/new) → با گیت‌هاب لاگین کن → ریپوی `chap34` رو **Import** کن
2. تو صفحه‌ی تنظیمات پروژه:
   - **Root Directory** = `chap34-frontend`
   - Framework Preset خودش `Next.js` رو تشخیص می‌ده
3. تو بخش **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = آدرس بک‌اند از مرحله‌ی ۲ (`https://<HF_USERNAME>-<HF_SPACE_NAME>.hf.space`)
4. **Deploy** بزن. با هر push بعدی به `main` که `chap34-frontend/` عوض بشه، Vercel خودکار دوباره دیپلوی می‌کنه.

---

## ترتیب پیشنهادی انجام کار

1. اول Neon (چون `DATABASE_URL` لازمش داری برای مرحله‌ی بعد)
2. بعد HF Space (چون آدرسش رو برای `NEXT_PUBLIC_API_URL` لازم داری)
3. آخر Vercel

## مهاجرت بعدی به سرور اصلی

هر سه مرحله فقط دو چیز عوض می‌کنن: مقدار `DATABASE_URL` و
`NEXT_PUBLIC_API_URL`. خود Dockerfileها (`chap34-backend/Dockerfile`,
`chap34-frontend/Dockerfile`) کاملاً پرتابل‌ان و بدون تغییر روی هر هاست
دیگه‌ای (VPS خودتون، سرور اصلی، هر ابر دیگه) هم اجرا می‌شن.
