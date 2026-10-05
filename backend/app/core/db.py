from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
from app.utils.logger import logger

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Get initialized Supabase client with service role key (bypasses RLS for backend writes)."""
    global _supabase_client
    if _supabase_client is None:
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                _supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                return None
    return _supabase_client
