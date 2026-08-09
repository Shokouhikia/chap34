FROM python:3.13-slim

WORKDIR /app

# build-essential: some ML deps (onnxruntime/insightface transitive deps) may need to
# compile from source depending on platform/arch.
# libgl1 + libglib2.0-0: opencv/insightface still probe for these at import time even
# in "headless" builds.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Uploaded photos live here (see app/main.py static mount). Mount a volume on
# this path in production or uploads are lost on every redeploy/restart.
RUN mkdir -p app/static/uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health')" || exit 1

CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
