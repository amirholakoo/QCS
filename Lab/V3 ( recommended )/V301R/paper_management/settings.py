"""
Django settings for paper_management project.
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-your-secret-key-here-change-in-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'corsheaders',
    'rest_framework',
    
    # Local apps
    'account',
    'paper',
    'pulp',
    'material',
    'logs',
    'report',
    'qc',
    'paper_type',
    'speed',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'paper_management.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'src'],  # For serving React build
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            'libraries':{
                'custom_templatetag': 'qc.templatetags.to_jalali',
            }
        },
    },
]

WSGI_APPLICATION = 'paper_management.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'lab',
        #'USER': 'pi_user',
        'USER': 'postgres',
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

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'src' / 'assets',  # For React build assets
]

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'account.CustomUser'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'paper_management.permissions.DjangoModelPermissionsWithView',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'paper_management.pagination.CustomPageNumberPagination',
    'PAGE_SIZE': 50
}

from corsheaders.defaults import default_headers

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    # Local dev
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # LAN access (your internal IP)
    "http://192.168.2.46:5173",
    "http://192.168.2.46",

    # Public IP / port-forwarded address
    "http://81.163.7.71:5173",
    "http://81.163.7.71",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$",
    r"^https?://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$",
    r"^https?://172\.16\.\d{1,3}\.\d{1,3}(:\d+)?$",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.2.46:5173",
    "http://81.163.7.71:5173",
    "http://81.163.7.71",
]

CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'x-csrftoken',
    'content-type',
]

CSRF_COOKIE_SAMESITE = None
SESSION_COOKIE_SAMESITE = None
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_AGE = 86400

