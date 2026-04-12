import type { ShapeType } from "../store/annotationStore";

/**
 * Типы для API запросов и ответов
 * Соответствуют структуре данных на бэкенде
 */

// ==================== ОБЩИЕ ТИПЫ ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== АННОТАЦИИ ====================

export interface AnnotationData {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  frameId: number;
  color: string;
  confidence?: number;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== ПРОЕКТЫ/СЕССИИ ====================

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileType: "video" | "image";
  status: "pending" | "processing" | "completed" | "failed";
}

export interface CreateProjectRequest {
  name: string;
  fileType: "video" | "image";
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

// ==================== ФАЙЛЫ ====================

export interface MediaFile {
  id: string;
  projectId: string;
  filename: string;
  filePath: string;
  fileType: "video" | "image";
  duration?: number; // для видео
  width: number;
  height: number;
  fps?: number; // для видео
  totalFrames?: number; // для видео
  uploadedAt: string;
}

export interface UploadFileResponse {
  file: MediaFile;
  uploadUrl?: string; // presigned URL для загрузки
}

// ==================== АННОТАЦИИ ====================

export interface AnnotationData {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  frameId: number;
  color: string;
  confidence?: number; // для ML предсказаний
  isManual: boolean; // ручная или авто-разметка
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationCreateRequest {
  projectId: string;
  annotations: AnnotationCreate[];
}

export interface AnnotationCreate {
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  frameId: number;
  color?: string;
  isManual?: boolean;
}

export interface AnnotationUpdateRequest {
  id: string;
  data: Partial<AnnotationCreate>;
}

export interface AnnotationExportRequest {
  projectId: string;
  frameId?: number;
  annotationType?: ShapeType | null;
  format: "json" | "yolo" | "coco" | "voc";
}

export interface AnnotationExportResponse {
  downloadUrl: string;
  format: string;
  expiresAt: string;
}

// ==================== КЛАССЫ/ЛЕЙБЛЫ ====================

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface LabelCreateRequest {
  projectId: string;
  name: string;
  color?: string;
}

export interface LabelListResponse {
  labels: Label[];
}

// ==================== ТРЕКИНГ/ОБРАБОТКА ====================

export interface TrackingRequest {
  projectId: string;
  frameId: number;
  annotationType: ShapeType;
  modelType: "sam2" | "yolo" | "custom";
  parameters?: {
    iouThreshold?: number;
    confidenceThreshold?: number;
    trackLength?: number;
  };
}

export interface TrackingResponse {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
}

export interface TrackingStatusResponse {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: {
    annotations: AnnotationData[];
    framesProcessed: number;
    totalFrames: number;
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TrackingCancelResponse {
  success: boolean;
  message: string;
}

// ==================== ПРЕВЬЮ/КАДРЫ ====================

export interface FramePreviewRequest {
  projectId: string;
  frameId: number;
}

export interface FramePreviewResponse {
  imageUrl: string;
  frameId: number;
  width: number;
  height: number;
}

export interface VideoFramesRequest {
  projectId: string;
  startFrame: number;
  endFrame: number;
  stride?: number;
}

export interface VideoFramesResponse {
  frames: {
    frameId: number;
    imageUrl: string;
    timestamp: number;
  }[];
  total: number;
}

// ==================== ML МОДЕЛИ ====================

export interface ModelInfo {
  id: string;
  name: string;
  type: "sam2" | "yolo" | "custom";
  version: string;
  description: string;
  isDefault: boolean;
}

export interface ModelListResponse {
  models: ModelInfo[];
}

// ==================== WEBHOOK/SOCKET СОБЫТИЯ ====================

export interface WsMessage<T> {
  type:
    | "tracking_progress"
    | "tracking_complete"
    | "tracking_error"
    | "annotation_update";
  payload: T;
  timestamp: string;
}

export interface TrackingProgressPayload {
  taskId: string;
  progress: number;
  framesProcessed: number;
  totalFrames: number;
  currentFrame?: number;
}

export interface TrackingCompletePayload {
  taskId: string;
  annotations: AnnotationData[];
  framesProcessed: number;
  totalFrames: number;
}

export interface TrackingErrorPayload {
  taskId: string;
  error: string;
  code: string;
}
