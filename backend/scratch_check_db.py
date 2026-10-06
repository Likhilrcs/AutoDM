import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')

try:
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, created_at, raw_user_meta_data FROM auth.users;")
            users = cur.fetchall()
            print("AUTH USERS:")
            for u in users:
                print(" ", u)

            cur.execute("SELECT * FROM public.profiles;")
            profiles = cur.fetchall()
            print("PROFILES:")
            for p in profiles:
                print(" ", p)

            cur.execute("""
                SELECT trigger_name, event_manipulation, event_object_table 
                FROM information_schema.triggers 
                WHERE event_object_table = 'users';
            """)
            triggers = cur.fetchall()
            print("TRIGGERS ON users:")
            for t in triggers:
                print(" ", t)
except Exception as e:
    print("Database error:", e)
