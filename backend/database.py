import os
from urllib.parse import urlparse, quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL from environment (Supabase PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required. Set it to your Supabase connection string.")

# Render gives postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# URL-encode the password to handle special characters like & , etc.
parsed = urlparse(DATABASE_URL)
if parsed.password:
    DATABASE_URL = DATABASE_URL.replace(
        f":{parsed.password}@",
        f":{quote_plus(parsed.password)}@",
        1,
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
