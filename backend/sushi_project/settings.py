"""Django settings for Sushi project."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "django_filters",
    "mozilla_django_oidc",
    # Local
    "core",
    "scheduling",
    "portal",
    "authentication",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "sushi_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "sushi_project.wsgi.application"

# Database
# Support DATABASE_URL (Railway/Heroku) or individual vars (Docker/local)
import urllib.parse

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": url.path[1:],
            "USER": url.username,
            "PASSWORD": url.password,
            "HOST": url.hostname,
            "PORT": url.port or 5432,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "sushi"),
            "USER": os.environ.get("DB_USER", "sushi"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "sushi"),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }

# Auth
AUTH_USER_MODEL = "core.User"

AUTHENTICATION_BACKENDS = [
    "authentication.oidc.SushiOIDCBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# OIDC Configuration (Keycloak / Entra ID)
OIDC_RP_CLIENT_ID = os.environ.get("OIDC_RP_CLIENT_ID", "")
OIDC_RP_CLIENT_SECRET = os.environ.get("OIDC_RP_CLIENT_SECRET", "")
OIDC_OP_AUTHORIZATION_ENDPOINT = os.environ.get("OIDC_OP_AUTHORIZATION_ENDPOINT", "")
OIDC_OP_TOKEN_ENDPOINT = os.environ.get("OIDC_OP_TOKEN_ENDPOINT", "")
OIDC_OP_USER_ENDPOINT = os.environ.get("OIDC_OP_USER_ENDPOINT", "")
OIDC_OP_JWKS_ENDPOINT = os.environ.get("OIDC_OP_JWKS_ENDPOINT", "")
OIDC_RP_SIGN_ALGO = os.environ.get("OIDC_RP_SIGN_ALGO", "RS256")
OIDC_RP_SCOPES = "openid email profile"

# Map OIDC groups to initial app roles
OIDC_GROUPS_CLAIM = os.environ.get("OIDC_GROUPS_CLAIM", "groups")
OIDC_MANAGER_GROUP = os.environ.get("OIDC_MANAGER_GROUP", "sushi-managers")
OIDC_TEAM_LEAD_GROUP = os.environ.get("OIDC_TEAM_LEAD_GROUP", "sushi-team-leads")
OIDC_SENIOR_TECH_GROUP = os.environ.get("OIDC_SENIOR_TECH_GROUP", "sushi-senior-techs")

LOGIN_REDIRECT_URL = os.environ.get("LOGIN_REDIRECT_URL", "http://localhost:5173/")
LOGOUT_REDIRECT_URL = os.environ.get("LOGOUT_REDIRECT_URL", "http://localhost:5173/")

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# CORS
_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
if "*" in _cors_origins:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# CSRF
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:8000"
    ).split(",") if o.strip()
]

# Static
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Frontend SPA — served by WhiteNoise from the built React app
FRONTEND_DIR = BASE_DIR / "frontend_dist"
WHITENOISE_ROOT = FRONTEND_DIR if FRONTEND_DIR.exists() else None

# Internationalization
LANGUAGE_CODE = "he"
TIME_ZONE = "Asia/Jerusalem"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
