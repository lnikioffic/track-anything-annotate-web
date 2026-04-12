import { create } from "zustand";

export type ShapeType = "rect" | "point";

export interface Annotation {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number; // only for rect
  height?: number; // only for rect
  label: string;
  frameId?: number; // for video
  color: string;
}

interface AppState {
  currentFile: string | null;
  fileType: "video" | "image" | null;
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  annotations: Annotation[];
  selectedLabel: string;
  labels: string[];
  tool: ShapeType | "select";
  processingProgress: number;
  isProcessing: boolean;
  skipDeleteConfirm: boolean;
  annotationType: ShapeType | null; // null = не выбран, только один тип может быть активен
  maskImage: string | null;
  currentVideoFile: File | null;
  firstFrameUrl: string | null;

  setFile: (file: string, type: "video" | "image") => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  removeAnnotationsByFrame: (frameId: number) => void;
  removeAnnotationsByLabel: (label: string, frameId?: number) => void;
  setCurrentFrame: (frame: number) => void;
  setSelectedLabel: (label: string) => void;
  setTool: (tool: ShapeType | "select") => void;
  setAnnotationType: (type: ShapeType | null) => void;
  addLabel: (label: string) => boolean;
  removeLabel: (label: string) => void;
  setSkipDeleteConfirm: (skip: boolean) => void;
  startProcessing: () => void;
  setMaskImage: (imageUrl: string | null) => void;
  setCurrentVideoFile: (file: File | null) => void;
  setFirstFrameUrl: (url: string | null) => void;
  reset: () => void;
}

const MAX_LABELS = 5;
const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

export const useStore = create<AppState>((set, get) => ({
  currentFile: null,
  fileType: null,
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 100, // Mock total
  annotations: [],
  selectedLabel: "",
  labels: [],
  tool: "select",
  processingProgress: 0,
  isProcessing: false,
  skipDeleteConfirm: false,
  annotationType: null,
  maskImage: null,
  currentVideoFile: null,
  firstFrameUrl: null,

  setFile: (file, type) =>
    set({
      currentFile: file,
      fileType: type,
      annotations: [],
      processingProgress: 0,
      isProcessing: false,
      annotationType: null, // Сбрасываем тип аннотации при загрузке нового файла
      maskImage: null,
      currentVideoFile: null,
      firstFrameUrl: null,
    }),

  addAnnotation: (ann) =>
    set((state) => {
      const color =
        colors[state.labels.indexOf(state.selectedLabel) % colors.length];
      // Устанавливаем тип аннотации при добавлении первой аннотации
      const newAnnotationType = state.annotationType || ann.type;
      return {
        annotations: [...state.annotations, { ...ann, color }],
        annotationType: newAnnotationType,
      };
    }),

  setAnnotationType: (type) =>
    set({
      annotationType: type,
      tool: type as ShapeType,
    }),

  updateAnnotation: (id, data) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...data } : a,
      ),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),

  removeAnnotationsByFrame: (frameId) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.frameId !== frameId),
    })),

  removeAnnotationsByLabel: (label, frameId) =>
    set((state) => ({
      annotations: state.annotations.filter(
        (a) =>
          a.label !== label || (frameId !== undefined && a.frameId !== frameId),
      ),
    })),

  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setSelectedLabel: (label) => set({ selectedLabel: label }),
  setTool: (tool) => set({ tool }),
  setSkipDeleteConfirm: (skip) => set({ skipDeleteConfirm: skip }),

  addLabel: (label) => {
    const state = get();
    // Проверка на существование
    if (state.labels.includes(label)) {
      return false;
    }
    // Проверка лимита
    if (state.labels.length >= MAX_LABELS) {
      return false;
    }
    // Добавление класса и автоматический выбор
    set((state) => ({
      labels: [...state.labels, label],
      selectedLabel: label, // Автоматически выбираем добавленный класс
    }));
    return true;
  },

  removeLabel: (label) =>
    set((state) => {
      const newLabels = state.labels.filter((l) => l !== label);
      // Удаляем все аннотации этого класса
      const newAnnotations = state.annotations.filter((a) => a.label !== label);
      return {
        labels: newLabels,
        annotations: newAnnotations,
        selectedLabel:
          state.selectedLabel === label
            ? newLabels[0] || ""
            : state.selectedLabel,
      };
    }),

  startProcessing: () => {
    set({ isProcessing: true });
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      set({ processingProgress: progress });
      if (progress >= 100) {
        clearInterval(interval);
        set({ isProcessing: false });
      }
    }, 500); // Simulate backend processing
  },

  setMaskImage: (imageUrl) => set({ maskImage: imageUrl }),

  setCurrentVideoFile: (file) => set({ currentVideoFile: file }),

  setFirstFrameUrl: (url) => set({ firstFrameUrl: url }),

  reset: () =>
    set({
      currentFile: null,
      annotations: [],
      isProcessing: false,
      processingProgress: 0,
      annotationType: null,
      maskImage: null,
      currentVideoFile: null,
      firstFrameUrl: null,
    }),
}));
