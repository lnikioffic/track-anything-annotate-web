# Frontend - Video Annotation Platform

React приложение для разметки видео и изображений.

## Архитектура

```
frontend/
├── src/
│   ├── components/          # UI компоненты
│   │   ├── annotation/      # Компоненты редактора (Konva)
│   │   ├── ui/              # Базовые UI компоненты
│   │   └── layout/          # Layout компоненты
│   ├── pages/               # Страницы приложения
│   │   ├── VideoAnnotation.tsx
│   │   └── PhotoAnnotation.tsx
│   ├── store/               # Zustand store
│   │   ├── annotationStore.ts      # Видео режим
│   │   └── imageAnnotationStore.ts # Фото режим
│   ├── services/            # API сервисы
│   │   ├── annotationService.ts
│   │   └── trackingService.ts
│   └── lib/                 # Утилиты и API
│       ├── apiClient.ts     # HTTP клиент
│       ├── wsClient.ts      # WebSocket клиент
│       ├── apiTypes.ts      # TypeScript типы API
│       ├── apiConfig.ts     # Конфигурация API
│       └── utils.ts         # Общие утилиты
```

## Интеграция с бэкендом

### Gateway (Rust/Axum)

Фронтенд взаимодействует с Gateway через:
- **HTTP REST API** - CRUD операции, загрузка файлов
- **WebSocket** - real-time обновления статуса трекинга

### Проксирование в разработке

Vite настроен на проксирование запросов:
- `/api/*` → `http://localhost:8000`
- `/ws/*` → `ws://localhost:8000`

### Переменные окружения

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_ENABLE_ML_TRACKING=true
VITE_ENABLE_AUTO_SAVE=true
```

## API Endpoints

### Проекты
- `GET /api/projects` - список проектов
- `POST /api/projects` - создать проект
- `GET /api/projects/:id` - информация о проекте
- `DELETE /api/projects/:id` - удалить проект

### Файлы
- `POST /api/files/upload` - загрузить файл
- `GET /api/projects/:id/files` - файлы проекта

### Аннотации
- `GET /api/projects/:id/annotations` - получить аннотации
- `POST /api/annotations/batch` - сохранить аннотации
- `PATCH /api/annotations/:id` - обновить аннотацию
- `DELETE /api/annotations/:id` - удалить аннотацию
- `POST /api/annotations/export` - экспорт аннотаций

### Классы
- `GET /api/projects/:id/labels` - список классов
- `POST /api/projects/:id/labels` - создать класс
- `DELETE /api/labels/:id` - удалить класс

### Трекинг
- `POST /api/tracking/start` - запустить трекинг
- `GET /api/tracking/:taskId/status` - статус трекинга
- `POST /api/tracking/:taskId/cancel` - отменить трекинг

### WebSocket события
- `tracking_progress` - прогресс обработки
- `tracking_complete` - завершение трекинга
- `tracking_error` - ошибка трекинга
- `annotation_update` - обновление аннотации

## Форматы данных

### Аннотация (запрос)
```typescript
interface AnnotationCreate {
  type: "rect" | "point";
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  frameId: number;
  color?: string;
  isManual?: boolean;
}
```

### Трекинг (запрос)
```typescript
interface TrackingRequest {
  projectId: string;
  frameId: number;
  annotationType: "rect" | "point";
  modelType: "sam2" | "yolo" | "custom";
  parameters?: {
    iouThreshold?: number;
    confidenceThreshold?: number;
    trackLength?: number;
  };
}
```

## Интеграция с ML

### Light Worker (CPU)
- Предпросмотр кадров
- Быстрая сегментация (SAM2 preview)

### Heavy Worker (GPU)
- Полноценный трекинг
- Обработка видео
- Batch обработка

## Разработка

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка
npm run build

# Линтинг
npm run lint
```

## Docker

```bash
# Сборка образа
docker build -t video-annotate-frontend .

# Запуск с docker-compose
docker-compose up frontend
```
