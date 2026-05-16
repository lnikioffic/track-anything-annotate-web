## Preview Worker

### Local run

Install dependencies and run the FastAPI app:

```powershell
uv sync --project workers/preview
uv run --project workers/preview --dev uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Health check:

```powershell
curl http://localhost:8000/health
```

### Production dependencies

The production Docker image uses `opencv-python-headless` and skips dev
dependencies:

```dockerfile
uv sync --frozen --no-dev
```

Keep `opencv-python` only in the `dev` dependency group if local GUI OpenCV
features are needed. Do not install dev dependencies in the production image.

### Docker build

Run from the repository root:

```powershell
docker build -t lniki/track-anything-preview-worker:latest .
```

### Docker push

```powershell
docker login
docker push lniki/track-anything-preview-worker:latest
```

### Server update

On the server:

```bash
docker compose -f docker-compose.prod.yml pull preview-worker
docker compose -f docker-compose.prod.yml up -d preview-worker gateway
```
