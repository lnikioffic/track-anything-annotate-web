import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Annotation } from "../store/annotationStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Формат аннотации для бэкенда (INSTRUCTION.md)
export interface BackendAnnotation {
  class_name: string;
  prompt: {
    mode: "point" | "box" | "both";
    point_coords?: number[][];
    point_labels?: number[];
    boxes?: number[][];
  };
}

// Параметры для масштабирования координат (простое масштабирование)
export interface ScaleParams {
  scaleX: number;
  scaleY: number;
}

/**
 * Вычисляет параметры масштабирования для конвертации координат
 * Из канваса (800x500) в целевое изображение/видео
 * Используется простое пропорциональное масштабирование (без letterbox)
 * @param canvasWidth - ширина канваса
 * @param canvasHeight - высота канваса
 * @param targetWidth - ширина целевого изображения/видео
 * @param targetHeight - высота целевого изображения/видео
 */
export function calculateScaleParams(
  canvasWidth: number,
  canvasHeight: number,
  targetWidth: number,
  targetHeight: number,
): ScaleParams {
  // Простое масштабирование без letterbox
  // Изображение растягивается на весь канвас
  return {
    scaleX: targetWidth / canvasWidth,
    scaleY: targetHeight / canvasHeight,
  };
}

/**
 * Конвертирует внутренние аннотации в формат для бэкенда
 * Группирует аннотации по label и frame
 * Все координаты округляются до целых чисел
 * @param annotations - массив аннотаций
 * @param frameId - идентификатор кадра
 * @param annotationType - тип аннотаций для экспорта (null = все типы)
 * @param scaleParams - параметры масштабирования (если нужно конвертировать координаты)
 */
export function annotationsToBackendFormat(
  annotations: Annotation[],
  frameId: number = 0,
  annotationType: "rect" | "point" | null = null,
  scaleParams?: ScaleParams,
): BackendAnnotation[] {
  const grouped = new Map<string, Annotation[]>();

  // Фильтруем по типу аннотации, если указан
  const filteredAnnotations = annotationType
    ? annotations.filter(
        (a) => a.type === annotationType && a.frameId === frameId,
      )
    : annotations.filter((a) => a.frameId === frameId);

  // Группируем по label
  for (const ann of filteredAnnotations) {
    const existing = grouped.get(ann.label) || [];
    existing.push(ann);
    grouped.set(ann.label, existing);
  }

  const result: BackendAnnotation[] = [];

  for (const [label, anns] of grouped) {
    const points = anns.filter((a) => a.type === "point");
    const rects = anns.filter((a) => a.type === "rect");

    const annotation: BackendAnnotation = {
      class_name: label,
      prompt: {
        mode:
          points.length > 0 && rects.length > 0
            ? "both"
            : points.length > 0
              ? "point"
              : "box",
      },
    };

    if (points.length > 0) {
      if (scaleParams) {
        // Конвертируем координаты с канваса на целевое изображение
        annotation.prompt.point_coords = points.map((p) => [
          Math.round(p.x * scaleParams.scaleX),
          Math.round(p.y * scaleParams.scaleY),
        ]);
      } else {
        annotation.prompt.point_coords = points.map((p) => [
          Math.round(p.x),
          Math.round(p.y),
        ]);
      }
      annotation.prompt.point_labels = points.map(() => 1);
    }

    if (rects.length > 0) {
      if (scaleParams) {
        // Конвертируем координаты с канваса на целевое изображение
        annotation.prompt.boxes = rects.map((r) => [
          Math.round(r.x * scaleParams.scaleX),
          Math.round(r.y * scaleParams.scaleY),
          Math.round((r.x + (r.width || 0)) * scaleParams.scaleX),
          Math.round((r.y + (r.height || 0)) * scaleParams.scaleY),
        ]);
      } else {
        annotation.prompt.boxes = rects.map((r) => [
          Math.round(r.x),
          Math.round(r.y),
          Math.round(r.x + (r.width || 0)),
          Math.round(r.y + (r.height || 0)),
        ]);
      }
    }

    result.push(annotation);
  }

  return result;
}

/**
 * Конвертирует аннотации из бэкенда во внутренний формат
 * Все координаты округляются до целых чисел
 */
export function backendToAnnotationsFormat(
  backendAnnotations: BackendAnnotation[],
  frameId: number = 0,
): Annotation[] {
  const result: Annotation[] = [];

  for (const backendAnn of backendAnnotations) {
    const { class_name, prompt } = backendAnn;

    // Конвертируем точки
    if (prompt.point_coords && prompt.point_labels) {
      for (let i = 0; i < prompt.point_coords.length; i++) {
        const [x, y] = prompt.point_coords[i];
        result.push({
          id: generateId(),
          type: "point",
          x: Math.round(x),
          y: Math.round(y),
          label: class_name,
          frameId,
          color: "#fff",
        });
      }
    }

    // Конвертируем bbox
    if (prompt.boxes) {
      for (const [x1, y1, x2, y2] of prompt.boxes) {
        result.push({
          id: generateId(),
          type: "rect",
          x: Math.round(x1),
          y: Math.round(y1),
          width: Math.round(x2 - x1),
          height: Math.round(y2 - y1),
          label: class_name,
          frameId,
          color: "#fff",
        });
      }
    }
  }

  return result;
}

/**
 * Экспорт аннотаций в JSON файл
 * @param annotations - массив аннотаций
 * @param frameId - идентификатор кадра
 * @param annotationType - тип аннотаций для экспорта (null = все типы)
 * @param format - формат экспорта (json, yolo, coco, voc)
 * @param scaleParams - параметры масштабирования (если нужно конвертировать координаты)
 */
export function exportAnnotationsToJson(
  annotations: Annotation[],
  frameId: number = 0,
  annotationType: "rect" | "point" | null = null,
  _format: "json" | "yolo" | "coco" | "voc" = "json",
  scaleParams?: ScaleParams,
): string {
  const backendFormat = annotationsToBackendFormat(
    annotations,
    frameId,
    annotationType,
    scaleParams,
  );

  // TODO: Реализовать конвертацию в разные форматы
  // Пока возвращаем JSON для всех форматов
  return JSON.stringify(backendFormat, null, 2);
}

/**
 * Импорт аннотаций из JSON строки
 */
export function importAnnotationsFromJson(
  jsonString: string,
  frameId: number = 0,
): Annotation[] {
  const backendAnnotations: BackendAnnotation[] = JSON.parse(jsonString);
  return backendToAnnotationsFormat(backendAnnotations, frameId);
}
