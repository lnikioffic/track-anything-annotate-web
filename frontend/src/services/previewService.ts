import type { BackendAnnotation } from "../lib/utils";

const PREVIEW_API_URL = "/api/v1/preview";

export type AnnotationPrompt = BackendAnnotation;

export interface PreviewResponse {
  blob: Blob;
  imageUrl: string;
}

class PreviewServiceImpl {
  async extractFirstFrame(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/v1/frame", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ошибка извлечения кадра: ${response.status} ${text}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

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
