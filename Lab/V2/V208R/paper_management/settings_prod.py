from .settings import *

# Production settings
DEBUG = True

# Your Raspberry Pi local IP and public IP
ALLOWED_HOSTS = [
    '*',
    'localhost',
    '127.0.0.1',
    '192.168.2.46',
    '192.168.2.46:6004',
    '81.163.7.71',
    '81.163.7.71:6004',  # Add with port
]

CSRF_TRUSTED_ORIGINS = [
    'http://81.163.7.71:6004',  # Changed
    'http://192.168.2.46:6004',  # Changed
]

CORS_ALLOWED_ORIGINS = [
    'http://81.163.7.71:6004',  # Changed
    'http://192.168.2.46:6004',  # Changed
]

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Security settings (optional but recommended)
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# Session settings (reduce "thrown out" logouts)
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_SAVE_EVERY_REQUEST = True
# If using HTTPS, set SESSION_COOKIE_SECURE = True (required when SameSite=None)


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,
        }
    }
}

# Static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Add this - important for React build and other static sources
STATICFILES_DIRS = [
    BASE_DIR / 'dist',  # React build output
]

# Optional: Static files storage (for better performance)
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'