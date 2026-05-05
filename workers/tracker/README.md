# Tracker Worker

Consumes tracking tasks from RabbitMQ, downloads source video from Yandex Disk,
updates task status in Valkey, and runs the tracking pipeline.

## Run locally

```bash
uv sync --extra cpu
uv run faststream run src.main:app
```

GPU setup:

```bash
uv sync --extra gpu
uv run --extra gpu faststream run src.main:app
```
