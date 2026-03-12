# 📋 ПЛАНЫ РЕАЛИЗАЦИИ БЭКЕНДА

## 1. ОБЩИЙ ПЛАН БЭКЕНДА

### Архитектурная схема компонентов

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Gateway    │    │ Light Worker │    │ Heavy Worker │               │
│  │    (Rust)    │    │   (Python)   │    │   (Python)   │               │
│  │              │    │              │    │              │               │
│  │ • API REST   │    │ • SAM Only   │    │ • XMem Only  │               │
│  │ • WebSocket  │    │ • CPU        │    │ • GPU        │               │
│  │ • S3 Presign │    │ • Preview    │    │ • Full Video │               │
│  │ • Queue Mgr  │    │ • Fast       │    │ • Slow       │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             │                                            │
│                    ┌────────▼────────┐                                   │
│                    │   ML Library    │                                   │
│                    │   (Shared)      │                                   │
│                    │                 │                                   │
│                    │ • SamController │                                   │
│                    │ • Tracker       │                                   │
│                    │ • XMem Core     │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│         ┌───────────────────┼───────────────────┐                        │
│         │                   │                   │                        │
│    ┌────▼────┐       ┌─────▼─────┐      ┌──────▼──────┐                 │
│    │  Redis  │       │   S3/MinIO│      │ PostgreSQL  │                 │
│    │  Queue  │       │  Storage  │      │   Status    │                 │
│    └─────────┘       └───────────┘      └─────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Поток данных между компонентами

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │ ──► │ Gateway  │ ──► │  Redis   │ ──► │  Light   │ ──► │   S3     │
│          │     │  (Rust)  │     │  Queue   │     │ Worker   │     │ (mask)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                     │                                      │
                     │                                      ▼
                     │                              ┌──────────┐
                     │                              │  Heavy   │
                     │                              │ Worker   │
                     │                              └──────────┘
                     │                                   │
                     ▼                                   ▼
               ┌──────────┐                       ┌──────────┐
               │   DB     │                       │   S3     │
               │ (Status) │                       │ (result) │
               └──────────┘                       └──────────┘
```

---

## 2. ПЛАН: ML LIBRARY (Shared Code)

### 2.1 Структура файлов

```
ml/
├── src/
│   └── video_ml/
│       ├── __init__.py              # Экспорт публичного API
│       ├── config.py                # Конфигурация моделей
│       ├── base/
│       │   ├── __init__.py
│       │   ├── base_controller.py   # Базовый класс для контроллеров
│       │   └── interfaces.py        # ABC интерфейсы
│       ├── sam/
│       │   ├── __init__.py
│       │   ├── sam_controller.py    # SAM логика (из sam_controller.py)
│       │   ├── segmenter.py         # Обёртка над SAM моделью
│       │   └── prompt_processor.py  # Обработка промптов
│       ├── tracker/
│       │   ├── __init__.py
│       │   ├── tracker.py           # Основной трекер (из tracker.py)
│       │   ├── xmem2_tracker.py     # XMem ядро
│       │   └── memory_manager.py    # Управление памятью трекера
│       ├── utils/
│       │   ├── __init__.py
│       │   ├── mask_utils.py        # merge_masks, colored_mask_to_indices
│       │   ├── video_processor.py   # Extract frames (из annotate_json.py)
│       │   └── annotations.py       # AnnotationInfo, Prompt types
│       └── exceptions.py            # Кастомные исключения
├── tests/
│   ├── test_sam_controller.py
│   ├── test_tracker.py
│   └── test_integration.py
├── setup.py
├── requirements.txt
└── README.md
```

### 2.2 Ключевые классы и функции

| Компонент | Класс/Функция | Описание | Источник |
|-----------|---------------|----------|----------|
| **SAM** | `SamController` | Управление сессией SAM, загрузка изображения | `sam_controller.py` |
| **SAM** | `SegmentationService` | Сегментация объектов по аннотациям | `sam_controller.py` |
| **SAM** | `PromptProcessor` | Валидация и парсинг промптов (point/box/both) | `sam_controller.py` |
| **Tracker** | `Tracker` | Координация SAM + XMem | `tracker.py` |
| **Tracker** | `TrackerCore` | XMem inference engine | `tracker.py` |
| **Utils** | `VideoProcessor` | Извлечение кадров из видео | `annotate_json.py` |
| **Utils** | `MaskMerger` | Объединение масок, unique IDs | `sam_controller.py` |

### 2.3 Рефакторинг существующего кода

#### `sam_controller.py` → `video_ml/sam/sam_controller.py`

```python
# Удалить __main__ блок
# Добавить типизацию
# Добавить логирование вместо print
# Добавить обработку ошибок с кастомными исключениями

class SamController:
    def __init__(self, model_path: str = None):
        self.segmenter = Segmenter(model_path)
        self.is_set_image = False
        self.logger = logging.getLogger(__name__)
    
    def set_image(self, image: np.ndarray) -> None:
        if self.is_set_image:
            self.logger.warning('Image already loaded. Reset first.')
            raise ImageAlreadyLoadedError()
        self.segmenter.set_image(image)
        self.is_set_image = True
    
    # ... остальной код
```

#### `tracker.py` → `video_ml/tracker/tracker.py`

```python
# Удалить зависимость от InteractiveVideo
# Сделать frames входным параметром
# Добавить progress callback для интеграции с worker

class Tracker:
    def track_objects(
        self,
        frames: list[np.ndarray],
        template_mask: np.ndarray,
        progress_callback: Callable[[int, int], None] = None
    ) -> list[np.ndarray]:
        masks = []
        for i, frame in enumerate(frames):
            if progress_callback:
                progress_callback(i, len(frames))
            # ... tracking logic
        return masks
```

### 2.4 Интеграционные точки

```python
# video_ml/__init__.py
from .sam.sam_controller import SamController, SegmentationService
from .tracker.tracker import Tracker
from .tracker.xmem2_tracker import TrackerCore
from .utils.video_processor import VideoProcessor
from .utils.annotations import AnnotationInfo, Prompt

__all__ = [
    'SamController',
    'SegmentationService', 
    'Tracker',
    'TrackerCore',
    'VideoProcessor',
    'AnnotationInfo',
    'Prompt'
]
```

### 2.5 Обработка ошибок

```python
# video_ml/exceptions.py
class VideoMLError(Exception):
    """Base exception for video_ml package"""
    pass

class ImageNotLoadedError(VideoMLError):
    """Raised when image is not loaded before operation"""
    pass

class ImageAlreadyLoadedError(VideoMLError):
    """Raised when trying to load image without reset"""
    pass

class TrackingError(VideoMLError):
    """Raised when tracking fails"""
    pass

class MemoryLimitError(VideoMLError):
    """Raised when VRAM/RAM limit exceeded"""
    pass
```

---

## 3. ПЛАН: LIGHT WORKER (CPU)

### 3.1 Структура файлов

```
workers/light_worker/
├── main.py                 # Точка входа
├── config.py               # Конфигурация (env vars)
├── worker.py               # Логика воркера
├── tasks/
│   ├── __init__.py
│   ├── preview_task.py     # Задача генерации превью
│   └── base_task.py        # Базовый класс задачи
├── services/
│   ├── __init__.py
│   ├── redis_client.py     # Redis подключение
│   ├── s3_client.py        # S3 подключение
│   └── db_client.py        # PostgreSQL подключение
├── Dockerfile
└── requirements.txt
```

### 3.2 Основной поток выполнения

```python
# workers/light_worker/main.py
import asyncio
from worker import LightWorker
from config import settings

async def main():
    worker = LightWorker(
        redis_url=settings.REDIS_URL,
        s3_config=settings.S3_CONFIG,
        db_url=settings.DATABASE_URL
    )
    await worker.start()

if __name__ == '__main__':
    asyncio.run(main())
```

### 3.3 Логика воркера

```python
# workers/light_worker/worker.py
from video_ml import SamController, Tracker, TrackerCore, VideoProcessor
from services import RedisClient, S3Client, DBClient

class LightWorker:
    def __init__(self, redis_url, s3_config, db_url):
        self.redis = RedisClient(redis_url)
        self.s3 = S3Client(s3_config)
        self.db = DBClient(db_url)
        self.sam_controller = SamController()
        self.tracker_core = TrackerCore()
        self.tracker = Tracker(self.sam_controller, self.tracker_core)
    
    async def start(self):
        while True:
            task = await self.redis.pop_task('queue:light')
            if task:
                await self.process_task(task)
    
    async def process_task(self, task: dict):
        task_id = task['task_id']
        video_url = task['video_url']
        prompts = task['prompts']
        
        try:
            # 1. Обновить статус
            await self.db.update_status(task_id, 'PROCESSING_PREVIEW')
            
            # 2. Скачать видео и извлечь 1 кадр
            local_video = await self.s3.download(video_url)
            processor = VideoProcessor(local_video)
            frames = processor.extract_all_frames(frames_to_propagate=1)
            
            # 3. Инициализировать трекер
            self.tracker.set_image(frames[0])
            
            # 4. Выполнить сегментацию (SAM)
            template_mask = self.tracker.segment_objects(prompts)
            
            # 5. Сохранить маску в S3
            mask_url = await self.s3.upload(
                template_mask, 
                f'tasks/{task_id}/mask_0.npy'
            )
            
            # 6. Отправить задачу в heavy очередь
            await self.redis.push_task('queue:heavy', {
                'task_id': task_id,
                'video_url': video_url,
                'mask_url': mask_url
            })
            
            # 7. Обновить статус
            await self.db.update_status(task_id, 'PREVIEW_READY', {
                'mask_url': mask_url
            })
            
            # 8. Уведомить через WebSocket (через Redis PubSub)
            await self.redis.publish('task_updates', {
                'task_id': task_id,
                'event': 'preview_ready',
                'data': {'mask_url': mask_url}
            })
            
        except Exception as e:
            await self.db.update_status(task_id, 'ERROR', {'error': str(e)})
            await self.redis.publish('task_updates', {
                'task_id': task_id,
                'event': 'error',
                'data': {'error': str(e)}
            })
        finally:
            self.tracker.reset()
```

### 3.4 Требования к ресурсам

| Ресурс | Минимум | Рекомендация |
|--------|---------|--------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| VRAM | 0 GB | 0 GB |
| Disk | 20 GB | 40 GB (кэш видео) |

### 3.5 Масштабирование

```yaml
# docker-compose.cpu-workers.yml
version: '3.8'
services:
  light-worker-1:
    build: ./workers/light_worker
    environment:
      - WORKER_ID=1
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 3  # 3 инстанса для параллельной обработки
```

---

## 4. ПЛАН: HEAVY WORKER (GPU)

### 4.1 Структура файлов

```
workers/heavy_worker/
├── main.py                 # Точка входа
├── config.py               # Конфигурация (env vars)
├── worker.py               # Логика воркера
├── tasks/
│   ├── __init__.py
│   ├── processing_task.py  # Задача полной обработки
│   └── base_task.py        # Базовый класс задачи
├── services/
│   ├── __init__.py
│   ├── redis_client.py     # Redis подключение
│   ├── s3_client.py        # S3 подключение
│   ├── db_client.py        # PostgreSQL подключение
│   └── gpu_monitor.py      # Мониторинг VRAM
├── Dockerfile
└── requirements.txt
```

### 4.2 Основной поток выполнения

```python
# workers/heavy_worker/main.py
import asyncio
from worker import HeavyWorker
from config import settings

async def main():
    worker = HeavyWorker(
        redis_url=settings.REDIS_URL,
        s3_config=settings.S3_CONFIG,
        db_url=settings.DATABASE_URL,
        gpu_id=settings.GPU_ID
    )
    await worker.start()

if __name__ == '__main__':
    asyncio.run(main())
```

### 4.3 Логика воркера

```python
# workers/heavy_worker/worker.py
import torch
from video_ml import Tracker, TrackerCore, VideoProcessor
from services import RedisClient, S3Client, DBClient, GPUMonitor

class HeavyWorker:
    def __init__(self, redis_url, s3_config, db_url, gpu_id):
        self.redis = RedisClient(redis_url)
        self.s3 = S3Client(s3_config)
        self.db = DBClient(db_url)
        self.gpu_monitor = GPUMonitor(gpu_id)
        
        # Инициализация моделей (один раз при старте)
        self.tracker_core = TrackerCore(device=f'cuda:{gpu_id}')
        self.sam_controller = None  # Не нужен для heavy
        
    async def start(self):
        while True:
            # Проверка доступности GPU перед взятием задачи
            if await self.gpu_monitor.is_available():
                task = await self.redis.pop_task('queue:heavy')
                if task:
                    await self.process_task(task)
            else:
                await asyncio.sleep(5)  # Ждать освобождения GPU
    
    async def process_task(self, task: dict):
        task_id = task['task_id']
        video_url = task['video_url']
        mask_url = task['mask_url']
        
        try:
            # 1. Обновить статус
            await self.db.update_status(task_id, 'PROCESSING_FULL')
            
            # 2. Скачать видео и маску
            local_video = await self.s3.download(video_url)
            local_mask = await self.s3.download(mask_url)
            template_mask = np.load(local_mask)
            
            # 3. Извлечь все кадры
            processor = VideoProcessor(local_video)
            frames = processor.extract_all_frames()
            
            # 4. Инициализировать трекер с первым кадром
            tracker = Tracker(None, self.tracker_core)
            tracker.set_image(frames[0])
            
            # 5. Запустить трекинг (XMem)
            def progress_callback(current, total):
                # Отправлять прогресс в Redis
                asyncio.create_task(self.redis.publish('task_updates', {
                    'task_id': task_id,
                    'event': 'progress',
                    'data': {'current': current, 'total': total}
                }))
            
            masks = tracker.track_objects(
                frames, 
                template_mask,
                progress_callback=progress_callback
            )
            
            # 6. Сохранить результат видео
            result_video = self.render_video(frames, masks)
            result_url = await self.s3.upload(
                result_video,
                f'tasks/{task_id}/result.mp4'
            )
            
            # 7. Обновить статус
            await self.db.update_status(task_id, 'DONE', {
                'result_url': result_url
            })
            
            # 8. Уведомить через WebSocket
            await self.redis.publish('task_updates', {
                'task_id': task_id,
                'event': 'complete',
                'data': {'result_url': result_url}
            })
            
        except Exception as e:
            await self.db.update_status(task_id, 'ERROR', {'error': str(e)})
            await self.redis.publish('task_updates', {
                'task_id': task_id,
                'event': 'error',
                'data': {'error': str(e)}
            })
        finally:
            tracker.reset()
            torch.cuda.empty_cache()  # Очистка VRAM
    
    def render_video(self, frames, masks):
        # Рендеринг видео с масками
        pass
```

### 4.4 Мониторинг GPU

```python
# workers/heavy_worker/services/gpu_monitor.py
import pynvml
import asyncio

class GPUMonitor:
    def __init__(self, gpu_id):
        pynvml.nvmlInit()
        self.handle = pynvml.nvmlDeviceGetHandleByIndex(gpu_id)
        self.vram_limit = 0.85  # 85% от доступной VRAM
    
    async def is_available(self) -> bool:
        info = pynvml.nvmlDeviceGetMemoryInfo(self.handle)
        used_ratio = info.used / info.total
        return used_ratio < self.vram_limit
    
    def get_vram_usage(self) -> dict:
        info = pynvml.nvmlDeviceGetMemoryInfo(self.handle)
        return {
            'total': info.total,
            'used': info.used,
            'free': info.free,
            'ratio': info.used / info.total
        }
```

### 4.5 Требования к ресурсам

| Ресурс | Минимум | Рекомендация |
|--------|---------|--------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| VRAM | 4 GB | 8-12 GB |
| Disk | 40 GB | 80 GB (кэш видео) |
| GPU | 1x (CUDA) | 1x (NVIDIA) |

### 4.6 Ограничения параллелизма

```python
# Конфигурация для предотвращения OOM
CONCURRENCY_LIMIT = 1  # Одна задача на GPU
VRAM_SAFETY_MARGIN = 0.85  # Не использовать более 85% VRAM
MEMORY_CHECK_INTERVAL = 5  # Проверка каждые 5 секунд
```

---

## 5. ПЛАН: RUST GATEWAY

### 5.1 Структура файлов

```
gateway/
├── src/
│   ├── main.rs              # Точка входа
│   ├── config.rs            # Конфигурация
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── upload.rs        # POST /api/upload
│   │   ├── status.rs        # GET /api/status/:task_id
│   │   ├── presign.rs       # GET /api/presign
│   │   └── ws.rs            # WS /api/ws
│   ├── models/
│   │   ├── mod.rs
│   │   ├── task.rs          # Task структура
│   │   └── request.rs       # Request структуры
│   ├── services/
│   │   ├── mod.rs
│   │   ├── redis.rs         # Redis клиент
│   │   ├── postgres.rs      # PostgreSQL клиент
│   │   ├── s3.rs            # S3 клиент
│   │   └── websocket.rs     # WebSocket менеджер
│   ├── db/
│   │   ├── mod.rs
│   │   ├── migrations/      # SQL миграции
│   │   └── queries.rs       # SQL запросы
│   └── middleware/
│       ├── mod.rs
│       ├── auth.rs          # Аутентификация
│       └── cors.rs          # CORS
├── static/                  # Frontend build (копируется при сборке)
├── Cargo.toml
├── Dockerfile
└── .env.example
```

### 5.2 Основной поток выполнения

```rust
// gateway/src/main.rs
use axum::{Router, routing::{get, post}};
use tower_http::services::ServeDir;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState::new().await);
    
    let api_routes = Router::new()
        .route("/upload", post(handlers::upload::handle_upload))
        .route("/status/:task_id", get(handlers::status::handle_status))
        .route("/presign", get(handlers::presign::handle_presign))
        .route("/ws", get(handlers::ws::handle_ws));
    
    let static_files = ServeDir::new("static")
        .append_index_html_on_directories(true);
    
    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(static_files)
        .with_state(state);
    
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### 5.3 Обработчик загрузки

```rust
// gateway/src/handlers/upload.rs
use axum::{extract::{Multipart, State}, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct UploadResponse {
    pub task_id: String,
    pub status: String,
}

pub async fn handle_upload(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart
) -> Json<UploadResponse> {
    let task_id = uuid::Uuid::new_v4().to_string();
    
    // 1. Получить Presigned URL для S3
    let upload_url = state.s3.generate_presigned_upload_url(
        &format!("tasks/{}/video.mp4", task_id)
    ).await;
    
    // 2. Создать запись в БД
    state.db.create_task(&Task {
        id: task_id.clone(),
        status: "PENDING".to_string(),
        video_url: upload_url.clone(),
        created_at: chrono::Utc::now(),
    }).await.unwrap();
    
    // 3. Отправить задачу в Redis очередь (light)
    state.redis.push_task("queue:light", TaskMessage {
        task_id: task_id.clone(),
        video_url: upload_url.clone(),
        prompts: extract_prompts_from_multipart(&mut multipart).await,
    }).await.unwrap();
    
    Json(UploadResponse {
        task_id,
        status: "queued".to_string(),
    })
}
```

### 5.4 WebSocket менеджер

```rust
// gateway/src/services/websocket.rs
use tokio::sync::broadcast;
use serde::Serialize;

pub struct WebSocketManager {
    tx: broadcast::Sender<WsMessage>,
}

#[derive(Serialize, Clone)]
pub struct WsMessage {
    pub task_id: String,
    pub event: String,
    pub data: serde_json::Value,
}

impl WebSocketManager {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        Self { tx }
    }
    
    pub async fn subscribe(&self, task_id: String) -> broadcast::Receiver<WsMessage> {
        let rx = self.tx.subscribe();
        // Фильтрация по task_id происходит на стороне клиента
        rx
    }
    
    pub async fn publish(&self, message: WsMessage) {
        let _ = self.tx.send(message);
    }
}
```

### 5.5 Redis интеграция

```rust
// gateway/src/services/redis.rs
use redis::{Client, PubSub, Connection};
use serde_json;

pub struct RedisClient {
    client: Client,
}

impl RedisClient {
    pub async fn push_task(&self, queue: &str, task: TaskMessage) -> Result<()> {
        let mut conn = self.client.get_async_connection().await?;
        let serialized = serde_json::to_string(&task)?;
        redis::cmd("LPUSH").arg(queue).arg(serialized).query_async(&mut conn).await
    }
    
    pub async fn subscribe_updates(&self) -> Result<PubSub> {
        let mut conn = self.client.get_async_connection().await?;
        let mut pubsub = conn.as_pubsub();
        pubsub.subscribe("task_updates").await?;
        Ok(pubsub)
    }
}
```

### 5.6 База данных схема

```sql
-- gateway/src/db/migrations/001_create_tasks.sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    video_url TEXT,
    mask_url TEXT,
    result_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    preview_ready_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 5.7 Требования к ресурсам

| Ресурс | Минимум | Рекомендация |
|--------|---------|--------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| VRAM | 0 GB | 0 GB |
| Disk | 10 GB | 20 GB |
| Network | 100 Mbit | 1 Gbit |

---

## 6. ПЛАН: ИНТЕГРАЦИЯ КОМПОНЕНТОВ

### 6.1 Последовательность развёртывания

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ORDER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Infrastructure                                                       │
│     ├── Redis Cluster                                                    │
│     ├── PostgreSQL                                                       │
│     └── S3/MinIO                                                         │
│                                                                          │
│  2. ML Library                                                           │
│     └── Build & Publish to PyPI (или mount volume)                       │
│                                                                          │
│  3. Workers                                                              │
│     ├── Light Worker (CPU) - 3 replicas                                  │
│     └── Heavy Worker (GPU) - 1 replica per GPU                           │
│                                                                          │
│  4. Gateway                                                              │
│     └── Rust Gateway + Frontend Static                                   │
│                                                                          │
│  5. Monitoring                                                           │
│     ├── Prometheus                                                       │
│     └── Grafana                                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Переменные окружения (общие)

```bash
# .env.example
REDIS_URL=redis://redis-host:6379
DATABASE_URL=postgresql://user:pass@db-host:5432/video_db
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=video-annotation
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
JWT_SECRET=xxx

# Light Worker specific
WORKER_TYPE=light
WORKER_CONCURRENCY=2

# Heavy Worker specific  
WORKER_TYPE=heavy
GPU_ID=0
VRAM_LIMIT=0.85

# Gateway specific
PORT=3000
STATIC_PATH=/app/static
WS_HEARTBEAT_INTERVAL=30
```

### 6.3 Health Checks

```yaml
# health_check_endpoints
Gateway:    GET /health     -> 200 OK
Light:      GET /health     -> 200 OK + Redis connection
Heavy:      GET /health     -> 200 OK + GPU available + Redis connection
```

### 6.4 Логирование

```python
# Python workers
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/worker.log')
    ]
)
```

```rust
// Rust Gateway
use tracing_subscriber;
tracing_subscriber::fmt::init();
```

---

## 7. ПЛАН: ТЕСТИРОВАНИЕ

### 7.1 Unit Tests (ML Library)

```bash
ml/tests/
├── test_sam_controller.py      # Тесты SAM
├── test_tracker.py             # Тесты Tracker
├── test_video_processor.py     # Тесты извлечения кадров
└── test_mask_utils.py          # Тесты масок
```

### 7.2 Integration Tests

```bash
tests/integration/
├── test_light_worker.py        # Light Worker + Redis + S3
├── test_heavy_worker.py        # Heavy Worker + GPU + Redis
└── test_gateway.py             # Gateway API + WebSocket
```

### 7.3 Load Tests

```bash
tests/load/
├── locustfile.py               # Locust сценарии
└── k6/                         # k6 сценарии
```

---

## 8. СВОДНАЯ ТАБЛИЦА КОМПОНЕНТОВ

| Компонент | Язык | Ресурсы | Очереди | Хранилище | Масштабирование |
|-----------|------|---------|---------|-----------|-----------------|
| **Gateway** | Rust | 2-4 vCPU, 4GB RAM | Redis Push | PostgreSQL, S3 | Horizontal (stateless) |
| **Light Worker** | Python | 4 vCPU, 8GB RAM | Redis Pop | S3 (mask) | Horizontal (3-10 replicas) |
| **Heavy Worker** | Python | 8 vCPU, 16GB RAM, 1 GPU | Redis Pop | S3 (result) | 1 per GPU |
| **ML Library** | Python | N/A | N/A | N/A | Versioned package |
| **Redis** | - | 2 vCPU, 4GB RAM | Queue + PubSub | In-Memory | Cluster |
| **PostgreSQL** | - | 2 vCPU, 8GB RAM | N/A | Tasks Status | Read replicas |
| **S3** | - | N/A | N/A | Video, Masks | Managed |

---

Эти планы покрывают всю кодовую базу бэкенда и обеспечивают чёткое разделение ответственности между компонентами с минимальным дублированием кода.
