FROM --platform=linux/amd64 python:3.14-slim AS base

# Системные зависимости: OpenCV + git (нужен для sam-2)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем uv через pip (надёжнее чем COPY из multi-arch образа)
RUN pip install --no-cache-dir uv

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

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
