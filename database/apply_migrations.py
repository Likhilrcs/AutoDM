import os
import sys
from pathlib import Path
import psycopg

# Add backend to path to read settings if needed
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings

def apply_migrations():
    db_url = settings.DATABASE_URL
    if not db_url:
        print("ERROR: DATABASE_URL is not set.")
        sys.exit(1)

    print(f"Connecting to database: {db_url.split('@')[-1]}...")

    migrations_dir = Path(__file__).resolve().parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("No migration files found.")
        return

    # Connect with psycopg
    with psycopg.connect(db_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            for sql_file in migration_files:
                print(f"Applying migration: {sql_file.name}...")
                sql_content = sql_file.read_text(encoding="utf-8")
                try:
                    cur.execute(sql_content)
                    print(f"✓ Successfully applied {sql_file.name}")
                except Exception as e:
                    print(f"✗ Failed applying {sql_file.name}: {e}")
                    raise e

    print("All migrations applied successfully to Supabase!")

if __name__ == "__main__":
    apply_migrations()
