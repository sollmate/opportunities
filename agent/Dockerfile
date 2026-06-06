# Multi-stage build for Azure Container Apps
# Uses uv for fast, reproducible installs into a slim runtime image.

ARG PYTHON_VERSION=3.13
FROM ghcr.io/astral-sh/uv:0.8.23 AS uv

# ---------- builder ----------
FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

COPY --from=uv /uv /uvx /usr/local/bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# Install deps without project first to maximise cache reuse
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --no-dev --frozen 2>/dev/null \
 || uv sync --no-install-project --no-dev

# Now copy the source and install the project itself
COPY src ./src
COPY app.py ./
RUN uv sync --no-dev --frozen 2>/dev/null \
 || uv sync --no-dev

# ---------- runtime ----------
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PROJECT_ROOT=/app/workspace

WORKDIR /app

# Non-root user for Azure Container Apps best practice
RUN groupadd --system --gid 1001 app \
 && useradd  --system --uid 1001 --gid app --create-home --shell /usr/sbin/nologin app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app src ./src
COPY --chown=app:app app.py ./

RUN mkdir -p /app/workspace && chown -R app:app /app/workspace

USER app

EXPOSE 8000

# Container Apps health probe hits /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=3).status==200 else 1)"

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
