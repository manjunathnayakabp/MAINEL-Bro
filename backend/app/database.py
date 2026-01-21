import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =====================================================
# DATABASE CONFIGURATION
# =====================================================
# Uses DATABASE_URL from environment (Docker / Cloud)
# Falls back to localhost for local development
# =====================================================

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Manju%401234@localhost:5432/moovit_chalo"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True  # Prevents stale DB connections
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# =====================================================
# DEPENDENCY (FastAPI)
# =====================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
