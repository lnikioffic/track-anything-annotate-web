# track-anything-annotate-web

Веб-версия инструмента аннотации видео — **Track Anything Annotate**.

## Архитектура
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────►│   Gateway    │────►│   Preview    │
│   (React)    │     │  (Rust/Axum) │     │   Worker     │
│   :5173      │     │   :8080      │     │  (FastAPI)   │
│              │     │              │     │   :8000      │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
          ┌──────▼──────┐    ┌─────────▼─────────┐
          │   RabbitMQ  │    │  Valkey (Redis)   │
          │   :5672     │    │  :6379            │
          │  UI: :15672 │    │                   │
          └──────┬──────┘    └─────────┬─────────┘
                 │                     │
                 └──────────┬──────────┘
                            │
                   ┌────────▼────────┐
                   │ Tracker Worker  │
                   │   (CPU / GPU)   │
                   └─────────────────┘
```
**Поток данных — Preview:**

1. Frontend отправляет `POST /api/v1/preview` с multipart form (`file` + `metadata`)
2. Gateway проксирует запрос на `POST /preview` воркера, передавая `file` + `json_data`
3. Preview Worker обрабатывает кадр через ML-модель и возвращает маску

**Поток данных — Tracking:**

1. Gateway публикует задачу трекинга в очередь RabbitMQ
2. Tracker Worker потребляет задачи, выполняет трекинг (CPU или GPU)
3. Результаты сохраняются через Yandex Disk, статус — через Valkey

---

## Структура проекта

```
.
├── docker-compose.yml              # Dev-окружение (сборка из исходников)
├── docker-compose.prod.yml         # Prod-окружение (готовые образы с Docker Hub)
├── docker-compose.tracker-cpu.yml  # Запуск tracker-worker на CPU (standalone)
├── docker-compose.tracker-gpu.yml  # Запуск tracker-worker на GPU (standalone)
├── tracker-k8s-gpu.yaml            # Kubernetes-манифест для GPU tracker-worker
├── Dockerfile.preview              # Preview Worker (Python/FastAPI)
├── Dockerfile.tracker              # Tracker Worker CPU (Python)
├── Dockerfile.tracker.gpu          # Tracker Worker GPU (CUDA)
├── .env.example                    # Шаблон переменных окружения
├── gateway/
│   ├── Dockerfile
│   └── src/                        # Rust/Axum исходный код
├── workers/
│   └── preview/
│       └── src/
│           ├── main.py             # FastAPI endpoint /preview
│           ├── state.py            # AppState с async lock
│           ├── schemas.py
│           └── utils.py
├── ml_core/                        # Shared ML-библиотека (модели, чекпоинты)
│   └── checkpoints/
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts              # Proxy → :8080
    └── src/
```

---

## Быстрый старт

### 1. Подготовка переменных окружения

```bash
cp .env.example .env
# Заполните YANDEX_DISK_TOKEN в .env
```

### 2. Dev-запуск (сборка из исходников)

```bash
docker compose up --build
```

После запуска:

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Gateway | http://localhost:8080 |
| Preview Worker | http://localhost:8000/docs |
| RabbitMQ Management UI | http://localhost:15672 (guest / guest) |
| Valkey | localhost:6379 |

### 3. Prod-запуск (готовые образы с Docker Hub)

```bash
# Основные сервисы (gateway + preview-worker + frontend + rabbitmq + valkey)
docker compose -f docker-compose.prod.yml up

# Tracker Worker запускается отдельно — на CPU:
docker compose -f docker-compose.tracker-cpu.yml up

# ...или на GPU:
docker compose -f docker-compose.tracker-gpu.yml up
```

> **Примечание:** Чекпоинты ML-моделей должны находиться в `./ml_core/checkpoints/`.
> Prod-compose монтирует эту папку в контейнер как `read-only`.

### 4. Остановка

```bash
docker compose down
```

---

## Конфигурация

### Переменные окружения (`.env`)

| Переменная | Описание | Пример |
|---|---|---|
| `PREVIEW_WORKER_URL` | URL Preview Worker для Gateway | `http://preview-worker:8000` |
| `YANDEX_DISK_TOKEN` | OAuth-токен Yandex Disk | `y0_AgAAAA...` |
| `REDIS_URL` | Строка подключения к Valkey/Redis | `redis://valkey:6379` |
| `RABBITMQ_URL` | AMQP-строка подключения | `amqp://guest:guest@rabbitmq:5672/%2f` |

### Соответствие эндпоинтов

| Компонент | Эндпоинт | Поля формы |
|---|---|---|
| Frontend → Gateway | `POST /api/v1/preview` | `file` + `metadata` |
| Gateway → Preview Worker | `POST /preview` | `file` + `json_data` |

---

## Tracker Worker

Tracker Worker — отдельный сервис для трекинга объектов по видео. Подключается к RabbitMQ и Valkey; не входит в основной `docker-compose.yml` (закомментирован).

### Docker Compose (CPU)

```bash
docker compose -f docker-compose.tracker-cpu.yml up
```

Worker подключается к RabbitMQ и Valkey по адресу `192.168.20.1` (хост-машина).

### Kubernetes (GPU)

```bash
kubectl apply -f tracker-k8s-gpu.yaml
```

Манифест разворачивает `Deployment` с `nvidia.com/gpu: 1`, `ConfigMap` с адресами брокера и кэша, `Service` типа ClusterIP (порт 8000 для метрик).

Перед применением заполните секрет и конфиг:

```bash
kubectl create secret generic tracker-secrets \
  --from-literal=yandex-disk-token=<YOUR_TOKEN>

kubectl create configmap tracker-config \
  --from-literal=rabbitmq-url=amqp://guest:guest@<HOST>:5672/ \
  --from-literal=redis-url=redis://<HOST>:6379
```

---

## Разработка без Docker

```bash
# 1. Preview Worker
cd workers/preview
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

# 2. Gateway
cd gateway
cargo run -p networking

# 3. Frontend
cd frontend
npm install
npm run dev
```

Инфраструктурные сервисы (RabbitMQ, Valkey) можно поднять отдельно:

```bash
docker compose up rabbitmq valkey
```

---

## Проверка работоспособности

```bash
# Gateway
curl http://localhost:8080

# Preview Worker (Swagger)
curl http://localhost:8000/docs

# Frontend
curl http://localhost:5173

# Запрос напрямую на Preview Worker
curl -X POST http://localhost:8000/preview \
  -F "file=@test4.mp4" \
  -F 'json_data=[{"class_name":"obj","prompt":{"mode":"point","point_coords":[[100,100]],"point_labels":[1]}}]'

# Запрос через Gateway
curl -X POST http://localhost:8080/v1/preview \
  -F "file=@test4.mp4" \
  -F 'metadata=[{"class_name":"obj","prompt":{"mode":"point","point_coords":[[100,100]],"point_labels":[1]}}]'

# Логи сервисов
docker compose logs -f gateway
docker compose logs -f preview-worker
docker compose logs -f frontend
```

---

## Лицензия

[MIT](LICENSE)
