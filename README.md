# track-anything-annotate-web
This is the web version of the video annotation tool - "Track Anything Annotate"

## Архитектура

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │ ──► │   Gateway    │ ──► │   Preview    │
│   (React)    │     │  (Rust/Axum) │     │   Worker     │
│   :5173      │     │   :8080      │     │  (FastAPI)   │
│              │     │              │     │   :8000      │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Поток данных:**
1. Frontend отправляет `POST /api/v1/preview` с multipart form (`file` + `metadata`)
2. Gateway проксирует запрос на `POST /preview` worker'а, передавая `file` + `json_data`
3. Preview worker обрабатывает изображение через ML и возвращает маску

## Быстрый старт

### Запуск всей системы одной командой

```bash
docker-compose up --build
```

После запуска:
- **Frontend**: http://localhost:5173
- **Gateway**: http://localhost:8080
- **Preview Worker**: http://localhost:8000

### Остановка

```bash
docker-compose down
```

## Структура проекта

```
.
├── docker-compose.yml          # Оркестрация всех сервисов
├── Dockerfile                  # Preview worker (Python/FastAPI)
├── .dockerignore
├── gateway/
│   ├── Dockerfile              # Rust/Axum gateway
│   ├── .dockerignore
│   ├── Cargo.toml
│   ├── .env                    # PREVIEW_WORKER_URL
│   └── networking/
│       └── src/                # Rust исходный код
├── workers/
│   └── preview/
│       ├── pyproject.toml
│       └── src/
│           ├── main.py         # FastAPI endpoint /preview
│           ├── state.py        # AppState с async lock
│           ├── schemas.py
│           └── utils.py
├── ml_core/                    # Shared ML библиотека
│   ├── pyproject.toml
│   └── src/
└── frontend/
    ├── Dockerfile              # Node.js dev server
    ├── vite.config.ts          # Proxy -> :8080
    ├── package.json
    └── src/
        └── services/
            └── previewService.ts
```

## Чек-лист верификации "Frontend -> Gateway -> Worker"

### 1. Проверка доступности сервисов

```bash
# Gateway должен отвечать
curl http://localhost:8080

# Worker должен отвечать
curl http://localhost:8000/docs

# Frontend должен загружаться
curl http://localhost:5173
```

### 2. Проверка Gateway -> Worker связи

```bash
# Отправить тестовый запрос напрямую на worker
curl -X POST http://localhost:8000/preview \
  -F "file=@test_image.jpg" \
  -F "json_data=[{\"class_name\":\"obj\",\"prompt\":{\"mode\":\"point\",\"point_coords\":[[100,100]],\"point_labels\":[1]}}]"

# Отправить через gateway (порт 8080)
curl -X POST http://localhost:8080/v1/preview \
  -F "file=@test_image.jpg" \
  -F "metadata=[{\"class_name\":\"obj\",\"prompt\":{\"mode\":\"point\",\"point_coords\":[[100,100]],\"point_labels\":[1]}}]"
```

### 3. Проверка из Frontend

1. Откройте http://localhost:5173
2. Загрузите изображение
3. Добавьте аннотацию (point/box)
4. Нажмите "Generate Preview"
5. Проверьте Network tab: запрос должен идти на `/api/v1/preview` (проксируется на `:8080`)

### 4. Логи сервисов

```bash
# Все логи
docker-compose logs -f

# Только gateway
docker-compose logs -f gateway

# Только worker
docker-compose logs -f preview-worker

# Только frontend
docker-compose logs -f frontend
```

## Конфигурация

### Переменные окружения

| Сервис | Переменная | Значение по умолчанию |
|--------|-----------|----------------------|
| Gateway | `PREVIEW_WORKER_URL` | `http://preview-worker:8000` |
| Gateway | `HOST` | `0.0.0.0` |
| Gateway | `PORT` | `8080` |
| Frontend | `VITE_PREVIEW_API_URL` | `/api/v1/preview` |
| Frontend | `VITE_API_BASE_URL` | `http://localhost:8080` |

### Ключевые соответствия

| Компонент | Endpoint | Поле формы |
|-----------|----------|------------|
| Gateway принимает | `POST /v1/preview` | `file` + `metadata` |
| Gateway -> Worker | `POST /preview` | `file` + `json_data` |
| Worker принимает | `POST /preview` | `file` + `json_data` |

## Разработка без Docker

```bash
# 1. Запустить worker
cd workers/preview
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

# 2. Запустить gateway
cd gateway
cargo run -p networking

# 3. Запустить frontend
cd frontend
npm install
npm run dev
```
