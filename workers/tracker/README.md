# Tracker Worker

Consumes tracking tasks from RabbitMQ, downloads source video from Yandex Disk,
updates task status in Valkey, and runs the tracking pipeline.

## Run locally

CPU with dev dependencies:

```bash
uv sync --extra cpu --dev
uv run --extra cpu --dev faststream run src.main:app
```

GPU with dev dependencies:

```bash
uv sync --extra gpu --dev
uv run --extra gpu --dev faststream run src.main:app
```

## Production dependencies

The production Docker image uses `opencv-python-headless` and skips dev
dependencies:

```dockerfile
uv sync --frozen --no-dev --extra gpu
```

Keep `opencv-python` only in the `dev` dependency group if local GUI OpenCV
features are needed. Do not install dev dependencies in the production image.

## Update lock file

Run from the repository root after dependency changes:

```bash
uv lock --project workers/tracker
uv lock --check --project workers/tracker
```

## Compose service

The production compose file should use the pushed image and GPU runtime
configuration:

```yaml
tracker-worker:
  image: lniki/track-anything-tracker-worker:latest
  environment:
    - YANDEX_DISK_TOKEN=${YANDEX_DISK_TOKEN}
    - REDIS_URL=${REDIS_URL}
    - RABBITMQ_URL=${RABBITMQ_URL}
  depends_on:
    valkey:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```
