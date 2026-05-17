/**
 * Сервис для работы с трекингом
 */

import apiClient from "../lib/apiClient";
import wsClient from "../lib/wsClient";
import type { ModelInfo, TrackingProgressPayload } from "../lib/apiTypes";

export interface TrackingProgress {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  framesProcessed: number;
  totalFrames: number;
  currentFrame?: number;
  error?: string;
}

export type TrackingProgressCallback = (progress: TrackingProgress) => void;

export interface TrackingService {
  startTracking(
    projectId: string,
    frameId: number,
    annotationType: "rect" | "point",
    modelType?: "sam2" | "yolo" | "custom",
    onProgress?: TrackingProgressCallback,
  ): Promise<string>;
  getStatus(taskId: string): Promise<TrackingProgress>;
  cancelTracking(taskId: string): Promise<void>;
  subscribe(taskId: string, callback: TrackingProgressCallback): () => void;
  getModels(): Promise<ModelInfo[]>;
}

class TrackingServiceImpl implements TrackingService {
  async startTracking(
    projectId: string,
    frameId: number,
    annotationType: "rect" | "point",
    modelType: "sam2" | "yolo" | "custom" = "sam2",
    onProgress?: TrackingProgressCallback,
  ): Promise<string> {
    wsClient.connect(projectId);

    if (onProgress) {
      this.subscribeToWebSocket(onProgress);
    }

    const response = await apiClient.startTracking({
      projectId,
      frameId,
      annotationType,
      modelType,
      parameters: {
        iouThreshold: 0.5,
        confidenceThreshold: 0.7,
        trackLength: 10,
      },
    });

    return response.taskId;
  }

  async getStatus(taskId: string): Promise<TrackingProgress> {
    const status = await apiClient.getTrackingStatus(taskId);
    return {
      taskId: status.taskId,
      status: status.status,
      progress: status.progress,
      framesProcessed: status.result?.framesProcessed || 0,
      totalFrames: status.result?.totalFrames || 0,
      currentFrame: status.result?.framesProcessed,
      error: status.error,
    };
  }

  async cancelTracking(taskId: string): Promise<void> {
    await apiClient.cancelTracking(taskId);
    wsClient.disconnect();
  }

  subscribe(_taskId: string, callback: TrackingProgressCallback): () => void {
    const handlers = new Set<TrackingProgressCallback>();
    handlers.add(callback);

    const progressHandler = (payload: TrackingProgressPayload) => {
      handlers.forEach((h) =>
        h({
          taskId: payload.taskId,
          status: "processing",
          progress: payload.progress,
          framesProcessed: payload.framesProcessed,
          totalFrames: payload.totalFrames,
          currentFrame: payload.currentFrame,
        }),
      );
    };

    wsClient.on("tracking_progress", progressHandler);

    return () => {
      wsClient.off("tracking_progress", progressHandler);
    };
  }

  private subscribeToWebSocket(callback: TrackingProgressCallback): void {
    wsClient.on("tracking_progress", (payload) => {
      callback({
        taskId: payload.taskId,
        status: "processing",
        progress: payload.progress,
        framesProcessed: payload.framesProcessed,
        totalFrames: payload.totalFrames,
        currentFrame: payload.currentFrame,
      });
    });

    wsClient.on("tracking_complete", (payload) => {
      callback({
        taskId: payload.taskId,
        status: "completed",
        progress: 100,
        framesProcessed: payload.framesProcessed,
        totalFrames: payload.totalFrames,
      });
    });

    wsClient.on("tracking_error", (payload) => {
      callback({
        taskId: payload.taskId,
        status: "failed",
        progress: 0,
        framesProcessed: 0,
        totalFrames: 0,
        error: payload.error,
      });
    });
  }

  async getModels(): Promise<ModelInfo[]> {
    return await apiClient.getModels();
  }
}

export const trackingService = new TrackingServiceImpl();
export default trackingService;
