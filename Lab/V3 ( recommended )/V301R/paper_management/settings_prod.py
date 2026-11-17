from .settings import *

# Production settings
DEBUG = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },

    'loggers': {
        'django.security.csrf': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },

        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    }
}

# Your Raspberry Pi local IP and public IP
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '192.168.2.46',
    '81.163.7.71',  # Add with port
]

CSRF_TRUSTED_ORIGINS = [
    'http://81.163.7.71:6004',
    'http://192.168.2.46:6004',
]

CORS_ALLOWED_ORIGINS = [
    'http://81.163.7.71:6004',
    'http://192.168.2.46:6004',
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
SESSION_SAVE_EVERY_REQUEST = False
# If using HTTPS, set SESSION_COOKIE_SECURE = True (required when SameSite=None)


SESSION_COOKIE_NAME = "sessionid"
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False
SESSION_ENGINE = 'django.contrib.sessions.backends.db'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'lab',
        'USER': 'pi_user',
        #'USER': 'postgres',
        'PASSWORD': '0000',
        'HOST': 'localhost',
        'PORT': '5432',
	"CONN_MAX_AGE": 0,
	'CONN_HEALTH_CHECKS': True,
	'OPTIONS': {
	    'connect_timeout': 5,
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