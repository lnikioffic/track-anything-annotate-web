import { API_BASE_URL, API_TIMEOUT } from "./apiConfig";
import type {
  ApiResponse,
  Project,
  CreateProjectRequest,
  MediaFile,
  UploadFileResponse,
  AnnotationCreateRequest,
  AnnotationData,
  AnnotationExportRequest,
  AnnotationExportResponse,
  Label,
  TrackingRequest,
  TrackingResponse,
  TrackingStatusResponse,
  FramePreviewResponse,
  ModelInfo,
} from "./apiTypes";

/**
 * API Client для взаимодействия с бэкендом
 * Gateway (Rust/Axum) + ML Workers (Python)
 */

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  // ==================== УТИЛИТЫ ====================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Request timeout", 408);
      }
      throw new ApiError("Network error", 0);
    }
  }

  // ==================== ПРОЕКТЫ ====================

  async getProjects(): Promise<Project[]> {
    const response =
      await this.request<ApiResponse<Project[]>>("/api/projects");
    return response.data || [];
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.request<ApiResponse<Project>>(
      `/api/projects/${id}`,
    );
    if (!response.data) throw new Error("Project not found");
    return response.data;
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await this.request<ApiResponse<Project>>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error("Failed to create project");
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/api/projects/${id}`, { method: "DELETE" });
  }

  // ==================== ФАЙЛЫ ====================

  async uploadFile(projectId: string, file: File): Promise<MediaFile> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);

    const response = await this.request<ApiResponse<UploadFileResponse>>(
      "/api/files/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.data) throw new Error("Upload failed");
    return response.data.file;
  }

  async getProjectFiles(projectId: string): Promise<MediaFile[]> {
    const response = await this.request<ApiResponse<MediaFile[]>>(
      `/api/projects/${projectId}/files`,
    );
    return response.data || [];
  }

  // ==================== АННОТАЦИИ ====================

  async saveAnnotations(
    projectId: string,
    annotations: AnnotationCreateRequest["annotations"],
  ): Promise<void> {
    await this.request("/api/annotations/batch", {
      method: "POST",
      body: JSON.stringify({ projectId, annotations }),
    });
  }

  async getAnnotations(
    projectId: string,
    frameId?: number,
  ): Promise<AnnotationData[]> {
    const params = new URLSearchParams();
    if (frameId !== undefined) params.append("frameId", frameId.toString());

    const response = await this.request<ApiResponse<AnnotationData[]>>(
      `/api/projects/${projectId}/annotations?${params}`,
    );
    return response.data || [];
  }

  async updateAnnotation(
    id: string,
    data: Partial<AnnotationData>,
  ): Promise<void> {
    await this.request(`/api/annotations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.request(`/api/annotations/${id}`, { method: "DELETE" });
  }

  async exportAnnotations(
    data: AnnotationExportRequest,
  ): Promise<AnnotationExportResponse> {
    const response = await this.request<ApiResponse<AnnotationExportResponse>>(
      "/api/annotations/export",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    if (!response.data) throw new Error("Export failed");
    return response.data;
  }

  // ==================== КЛАССЫ/ЛЕЙБЛЫ ====================

  async getLabels(projectId: string): Promise<Label[]> {
    const response = await this.request<ApiResponse<Label[]>>(
      `/api/projects/${projectId}/labels`,
    );
    return response.data || [];
  }

  async createLabel(
    projectId: string,
    name: string,
    color?: string,
  ): Promise<Label> {
    const response = await this.request<ApiResponse<Label>>(
      `/api/projects/${projectId}/labels`,
      {
        method: "POST",
        body: JSON.stringify({ projectId, name, color }),
      },
    );
    if (!response.data) throw new Error("Failed to create label");
    return response.data;
  }

  async deleteLabel(id: string): Promise<void> {
    await this.request(`/api/labels/${id}`, { method: "DELETE" });
  }

  // ==================== ТРЕКИНГ ====================

  async startTracking(data: TrackingRequest): Promise<TrackingResponse> {
    const response = await this.request<ApiResponse<TrackingResponse>>(
      "/api/tracking/start",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    if (!response.data) throw new Error("Failed to start tracking");
    return response.data;
  }

  async getTrackingStatus(taskId: string): Promise<TrackingStatusResponse> {
    const response = await this.request<ApiResponse<TrackingStatusResponse>>(
      `/api/tracking/${taskId}/status`,
    );
    if (!response.data) throw new Error("Status not found");
    return response.data;
  }

  async cancelTracking(taskId: string): Promise<void> {
    await this.request(`/api/tracking/${taskId}/cancel`, { method: "POST" });
  }

  // ==================== ПРЕВЬЮ ====================

  async getFramePreview(
    projectId: string,
    frameId: number,
  ): Promise<FramePreviewResponse> {
    const response = await this.request<ApiResponse<FramePreviewResponse>>(
      `/api/projects/${projectId}/frames/${frameId}`,
    );
    if (!response.data) throw new Error("Frame not found");
    return response.data;
  }

  // ==================== МОДЕЛИ ====================

  async getModels(): Promise<ModelInfo[]> {
    const response =
      await this.request<ApiResponse<ModelInfo[]>>("/api/models");
    return response.data || [];
  }
}

// ==================== ОШИБКИ ====================

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ==================== ЭКСПОРТ ====================

export const apiClient = new ApiClient();
export default apiClient;
