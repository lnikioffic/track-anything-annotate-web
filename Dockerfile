FROM python:3.14-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Системные зависимости для OpenCV
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория — КОРЕНЬ проекта
WORKDIR /app

COPY workers/preview/pyproject.toml workers/preview/uv.lock ./workers/preview/

RUN mkdir -p ml_core \
    && echo '[project]\nname="ml-core"\nversion="0.1.0"' > ml_core/pyproject.toml

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync \
    --frozen \
    --no-install-workspace \
    --no-editable \
    --project workers/preview

COPY ml_core/ ./ml_core/
COPY workers/preview/ ./workers/preview/

WORKDIR /app/workers/preview

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

EXPOSE 8000

# Если main.py лежит в папке src, используем "src.main:app"
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
