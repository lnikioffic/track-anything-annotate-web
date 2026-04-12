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

/**
 * Извлекает первый кадр из видеофайла и возвращает как Blob
 */
function extractFirstFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.onloadeddata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to extract frame"));
        },
        "image/jpeg",
        0.95,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

/**
 * Проверяет, является ли файл видео
 */
function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

class PreviewServiceImpl {
  /**
   * Генерация превью маски по первому кадру
   * Если загружено видео — автоматически извлекается первый кадр
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

    // Если видео — извлекаем первый кадр, иначе отправляем как есть
    if (isVideoFile(file)) {
      const frameBlob = await extractFirstFrame(file);
      formData.append("file", frameBlob, "frame.jpg");
    } else {
      formData.append("file", file);
    }

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
