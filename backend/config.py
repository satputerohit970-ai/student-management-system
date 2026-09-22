import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from backend/.env or root .env
base_dir = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(base_dir, '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(base_dir), '.env')

load_dotenv(dotenv_path)

class Config:
    """Application configuration settings."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_sms_secret_key_change_me')
    
    # Database configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'student_management_system')
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
