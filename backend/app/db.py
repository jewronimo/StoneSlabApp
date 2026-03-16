from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_db_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.scalar()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()