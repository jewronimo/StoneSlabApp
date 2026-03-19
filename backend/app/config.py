import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = (
    f"postgresql+psycopg://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
    f"@localhost:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)

AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "stone-slab-dev-secret-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin")
DEFAULT_GUEST_USERNAME = os.getenv("DEFAULT_GUEST_USERNAME", "guest")
DEFAULT_GUEST_PASSWORD = os.getenv("DEFAULT_GUEST_PASSWORD", "guest-readonly")
