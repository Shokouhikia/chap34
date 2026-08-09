# دیپلوی رایگان: Netlify + Neon + Render

پروژه الان روی سه سرویس رایگان مستقره:

- **دیتابیس**: [Neon](https://neon.tech) (Postgres)
- **بک‌اند**: [Render](https://render.com) (Docker Web Service)
- **فرانت‌اند**: [Netlify](https://netlify.com)

(Vercel و Hugging Face Spaces به‌عنوان گزینه‌ی اول امتحان شدن ولی کنار
گذاشته شدن: Vercel لاگینش شماره تلفن می‌خواست، و Docker Space رایگان
Hugging Face این‌روزها نیاز به اشتراک PRO داره.)

## وضعیت فعلی

| بخش | آدرس | نکته |
|---|---|---|
| دیتابیس | Neon project `chap34` (`damp-frost-28180012`) | — |
| بک‌اند | `https://chap34-backend.onrender.com` | با هر push به `main` که `chap34-backend/` رو عوض کنه خودکار ری‌دیپلوی می‌شه |
| فرانت‌اند | `https://chap34-app.netlify.app` | **بدون** دیپلوی خودکار از گیت‌هاب — دستورالعمل زیر رو ببین |

## ۱. دیتابیس — Neon

از داشبورد [console.neon.tech](https://console.neon.tech) یا API (با یه API
key از **Account Settings → API Keys**) قابل مدیریته. `DATABASE_URL` باید
پیشوندش `postgresql+psycopg2://` باشه (کد از psycopg2 استفاده می‌کنه).

## ۲. بک‌اند — Render (Docker، رایگان)

سرویس از نوع **Web Service** با `rootDir: chap34-backend` و همون
`Dockerfile` موجود ساخته شده. چون ریپو **public**ه، Render مستقیم از روی
URL ریپو کلون می‌کنه — نیازی به نصب جداگونه‌ی اپ گیت‌هاب نیست.

**Environment variables** (از داشبورد Render → سرویس → Environment):
`DATABASE_URL`, `SECRET_KEY`, `ADMIN_USER`, `ADMIN_PASS`,
`ENVIRONMENT=production`

⚠️ **محدودیت تیر رایگان Render**: بعد از ۱۵ دقیقه بی‌کاری سرویس می‌خوابه
(کولد استارت ~۳۰-۶۰ ثانیه‌ای موقع اولین درخواست بعدی). دیسک هم ephemeral
هست، یعنی `app/static/uploads` با هر ری‌دیپلوی پاک می‌شه — برای دمو مشکلی
نیست، برای واقعی‌شدن باید storage به یه Object Storage وصل بشه.

## ۳. فرانت‌اند — Netlify (رایگان)

سایت (`chap34-app`) از طریق API ساخته شد، اما وصل‌کردنش به گیت‌هاب برای
دیپلوی خودکار (git-linked continuous deployment) به یه مرحله‌ی مرورگری
نیاز داره که فقط خود کاربر می‌تونه انجامش بده (نصب/تأیید Netlify GitHub
App روی ریپو) — بدون اون مرحله، Netlify سعی می‌کنه با SSH کلون کنه و
خطای `Host key verification failed` می‌ده.

**راه فعلی (دیپلوی دستی)**: هر وقت فرانت‌اند تغییر کرد، از ریشه‌ی ریپو
این رو اجرا کن (به `netlify.toml` نگاه می‌کنه، `base` رو خودش می‌فهمه):

```bash
NEXT_PUBLIC_API_URL=https://chap34-backend.onrender.com \
  npx netlify-cli deploy --build --prod --site 37437846-05a3-4dac-a5bb-a91f9e57c172 --auth <NETLIFY_AUTH_TOKEN>
```

⚠️ حتماً `NEXT_PUBLIC_API_URL` رو صریح پاس بده — دیپلوی محلی با `--build`
برخلاف انتظار، env varهای ست‌شده روی سایت (توی داشبورد/API) رو خودکار
موقع build نمی‌کشه؛ بدون این مقدار build با پیش‌فرض `localhost:8000`
ساخته می‌شه و روی سایت لایو خطای «اتصال به سرور برقرار نشد» می‌ده.

**برای فعال‌کردن دیپلوی خودکار روی هر push** (اختیاری، یه‌بار انجام
می‌شه): برو به [app.netlify.com/projects/chap34-app](https://app.netlify.com/projects/chap34-app)
→ **Site configuration → Build & deploy → Link repository** → ریپوی
`chap34` رو انتخاب کن و دسترسی گیت‌هاب رو تأیید کن. بعدش هر push به
`main` که `chap34-frontend/` یا `netlify.toml` رو عوض کنه خودکار
دیپلوی می‌شه و دیگه نیازی به دستور دستی بالا نیست.

**Environment variables** (از داشبورد یا API): `NEXT_PUBLIC_API_URL` باید
برابر آدرس بک‌اند باشه (`https://chap34-backend.onrender.com`) — چون
`NEXT_PUBLIC_*` موقع build توی باندل inline می‌شه، هر بار که این مقدار
عوض بشه باید یه build جدید بگیره.

نکته‌ی فنی: `next.config.js` مقدار `output: "standalone"` رو فقط وقتی
`NETLIFY` ست نشده فعال می‌کنه (خود Netlify موقع build خودکار
`NETLIFY=true` رو ست می‌کنه) — چون این خروجی با Netlify Next Runtime
ناسازگاره ولی برای Dockerfile پرتابل (پایین رو ببین) لازمه.

---

## مهاجرت بعدی به سرور اصلی

`Dockerfile`های هر دو بخش (`chap34-backend/Dockerfile`,
`chap34-frontend/Dockerfile`) کاملاً پرتابل‌ان و بدون تغییر روی هر هاست
دیگه‌ای (VPS خودتون، سرور اصلی، هر ابر دیگه) هم اجرا می‌شن — فقط
`DATABASE_URL` و `NEXT_PUBLIC_API_URL` عوض می‌شن.
