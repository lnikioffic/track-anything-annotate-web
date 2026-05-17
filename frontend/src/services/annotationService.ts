/**
 * Сервис для работы с аннотациями
 */

import apiClient from "../lib/apiClient";
import type { AnnotationData, AnnotationCreate } from "../lib/apiTypes";

export interface AnnotationService {
  loadAnnotations(
    projectId: string,
    frameId?: number,
  ): Promise<AnnotationData[]>;
  saveAnnotation(
    projectId: string,
    annotation: AnnotationCreate,
  ): Promise<AnnotationData>;
  updateAnnotation(id: string, data: Partial<AnnotationCreate>): Promise<void>;
  deleteAnnotation(id: string): Promise<void>;
  saveBatch(projectId: string, annotations: AnnotationCreate[]): Promise<void>;
  exportAnnotations(
    projectId: string,
    frameId: number | undefined,
    annotationType: "rect" | "point" | null | undefined,
    format: "json" | "yolo" | "coco" | "voc",
  ): Promise<string>;
}

class AnnotationServiceImpl implements AnnotationService {
  async loadAnnotations(
    projectId: string,
    frameId?: number,
  ): Promise<AnnotationData[]> {
    return await apiClient.getAnnotations(projectId, frameId);
  }

  async saveAnnotation(
    projectId: string,
    annotation: AnnotationCreate,
  ): Promise<AnnotationData> {
    await apiClient.saveAnnotations(projectId, [annotation]);
    const annotations = await apiClient.getAnnotations(
      projectId,
      annotation.frameId,
    );
    return annotations[annotations.length - 1];
  }

  async updateAnnotation(
    id: string,
    data: Partial<AnnotationCreate>,
  ): Promise<void> {
    await apiClient.updateAnnotation(id, data);
  }

  async deleteAnnotation(id: string): Promise<void> {
    await apiClient.deleteAnnotation(id);
  }

  async saveBatch(
    projectId: string,
    annotations: AnnotationCreate[],
  ): Promise<void> {
    await apiClient.saveAnnotations(projectId, annotations);
  }

  async exportAnnotations(
    projectId: string,
    frameId?: number,
    annotationType?: "rect" | "point" | null,
    format: "json" | "yolo" | "coco" | "voc" = "json",
  ): Promise<string> {
    const response = await apiClient.exportAnnotations({
      projectId,
      frameId,
      annotationType,
      format,
    });
    return response.downloadUrl;
  }
}

export const annotationService = new AnnotationServiceImpl();
export default annotationService;
