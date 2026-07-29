from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

# echo=True is handy in development to see generated SQL; turn off in production.
engine = create_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a DB session per request
    and closes it automatically afterwards.
    """
    with Session(engine) as session:
        yield session
