from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app settings, loaded from environment variables / .env file.
    """
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = "change-me-in-production"

    database_url: str = (
        "postgresql+psycopg2://sedarchahar:sedarchahar_dev_pass@127.0.0.1:5432/sedarchahar"
    )

    sms_api_key: str | None = None
    payment_merchant_id: str | None = None

    storage_bucket_url: str | None = None
    storage_access_key: str | None = None
    storage_secret_key: str | None = None

    # OTP behavior
    otp_ttl_seconds: int = 120
    otp_max_attempts: int = 5

    # Anonymous session behavior (before phone verification)
    anonymous_session_ttl_hours: int = 24

    admin_user: str = "admin"
    admin_pass: str = "admin123"


settings = Settings()
