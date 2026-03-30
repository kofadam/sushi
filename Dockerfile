# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend + built frontend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy built frontend into a directory Django/WhiteNoise can serve
COPY --from=frontend-build /frontend/dist /app/frontend_dist

# Collect Django static files (admin CSS etc.)
ENV DJANGO_SETTINGS_MODULE=sushi_project.settings
RUN DATABASE_URL=sqlite:///tmp/dummy.db python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_data --with-demo-users && gunicorn sushi_project.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2"]
