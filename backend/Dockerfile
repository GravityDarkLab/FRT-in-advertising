# syntax=docker/dockerfile:1

FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app

# Dependencies first: this layer is reused until the lockfile changes.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# Models next: checksummed, and reused until the script changes.
COPY scripts/fetch_models.py scripts/
RUN python scripts/fetch_models.py models

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable


FROM python:3.13-slim
RUN useradd --system --uid 10001 --no-create-home frt
WORKDIR /app
COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app/models ./models
# AWS Lambda Web Adapter: lets this same image run as a Lambda function. Lambda
# starts whatever is in /opt/extensions, and the adapter then turns each
# invocation into an ordinary HTTP request to the server below. Anywhere else
# (docker run, compose, any container host) nothing starts it and it is inert.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter
ENV PATH="/app/.venv/bin:$PATH" \
    FRT_MODELS_DIR=/app/models \
    PYTHONUNBUFFERED=1 \
    AWS_LWA_PORT=8000 \
    AWS_LWA_READINESS_CHECK_PATH=/health
USER frt
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]
CMD ["uvicorn", "frt_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
