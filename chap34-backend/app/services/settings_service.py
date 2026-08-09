from sqlmodel import Session, select

from app.models.setting import Setting, DEFAULT_SETTINGS, SECRET_KEYS


def ensure_defaults(db: Session) -> None:
    existing = {s.key for s in db.exec(select(Setting)).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing:
            db.add(Setting(key=key, value=value, is_secret=key in SECRET_KEYS))
    db.commit()


def get_all(db: Session) -> dict[str, str]:
    return {s.key: s.value for s in db.exec(select(Setting)).all()}


def get_value(db: Session, key: str) -> str:
    row = db.get(Setting, key)
    return row.value if row else ""


def set_values(db: Session, updates: dict[str, str]) -> None:
    for key, value in updates.items():
        if value == "" or value is None:
            continue
        row = db.get(Setting, key)
        if row is None:
            row = Setting(key=key, value=value, is_secret=key in SECRET_KEYS)
        else:
            row.value = value
        db.add(row)
    db.commit()


def mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "•" * len(value)
    return "•" * (len(value) - 4) + value[-4:]
