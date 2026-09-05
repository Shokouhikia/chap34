"""
Real SMTP email sending, gated on the admin having configured `smtp_host`
in Settings. Returns False (never raises) when not configured or sending
fails - callers use this for best-effort notifications.
"""
import smtplib
from email.mime.text import MIMEText

from sqlmodel import Session

from app.models.setting import (
    KEY_SMTP_FROM_EMAIL,
    KEY_SMTP_HOST,
    KEY_SMTP_PASSWORD,
    KEY_SMTP_PORT,
    KEY_SMTP_USERNAME,
)
from app.services import settings_service


def send_email(db: Session, to_email: str, subject: str, body: str) -> bool:
    host = settings_service.get_value(db, KEY_SMTP_HOST)
    if not host:
        return False

    port = int(settings_service.get_value(db, KEY_SMTP_PORT) or "587")
    username = settings_service.get_value(db, KEY_SMTP_USERNAME)
    password = settings_service.get_value(db, KEY_SMTP_PASSWORD)
    from_email = settings_service.get_value(db, KEY_SMTP_FROM_EMAIL) or username or "no-reply@chap34.ir"

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if username:
                server.login(username, password)
            server.sendmail(from_email, [to_email], message.as_string())
        return True
    except (smtplib.SMTPException, OSError):
        return False
