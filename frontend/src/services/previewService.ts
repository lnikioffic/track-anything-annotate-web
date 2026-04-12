/**
 * Сервис для работы с preview worker через gateway (генерация маски по первому кадру)
 */

// Относительный URL — проксируется через Vite dev server
const PREVIEW_API_URL = "/api/v1/preview";

export interface PointPrompt {
  mode: "point";
  point_coords: number[][]; // [[x, y], ...]
  point_labels: number[]; // [1, 0, ...]
}

export interface BoxPrompt {
  mode: "box";
  boxes: number[][]; // [[x1, y1, x2, y2], ...]
}

export interface BothPrompt {
  mode: "both";
  point_coords: number[][];
  point_labels: number[];
  boxes: number[][];
}

export type PromptData = PointPrompt | BoxPrompt | BothPrompt;

export interface AnnotationPrompt {
  class_name: string;
  prompt: PromptData;
}

export interface PreviewResponse {
  blob: Blob;
  imageUrl: string;
}

class PreviewServiceImpl {
  /**
   * Генерация превью маски по первому кадру
   * @param file - файл изображения или видео
   * @param annotations - массив аннотаций для генерации маски
   */
  async generateMaskPreview(
    file: File | null,
    annotations: AnnotationPrompt[],
  ): Promise<PreviewResponse> {
    if (!file) {
      throw new Error("Файл не загружен");
    }

    if (annotations.length === 0) {
      throw new Error("Добавьте хотя бы одну аннотацию");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(annotations));

    const response = await fetch(PREVIEW_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ошибка генерации маски: ${response.status} ${errorText}`,
      );
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    return { blob, imageUrl };
  }
}

export const previewService = new PreviewServiceImpl();
export default previewService;
