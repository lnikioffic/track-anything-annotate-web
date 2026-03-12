import { create } from "zustand";
import type { Annotation, ShapeType } from "./annotationStore";

interface ImageAnnotationState {
  images: string[];
  imageFiles: File[];
  imageSizes: { width: number; height: number }[]; // Размеры изображений
  currentImageIndex: number;
  annotations: Annotation[];
  selectedLabel: string;
  labels: string[];
  tool: ShapeType | "select";
  annotationType: ShapeType | null;
  skipDeleteConfirm: boolean;
  maskImage: string | null;

  setImages: (
    images: string[],
    files: File[],
    sizes?: { width: number; height: number }[],
  ) => void;
  addImage: (
    image: string,
    file?: File,
    size?: { width: number; height: number },
  ) => void;
  setCurrentImageIndex: (index: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  removeAnnotationsByImage: (imageIndex: number) => void;
  setSelectedLabel: (label: string) => void;
  setTool: (tool: ShapeType | "select") => void;
  setAnnotationType: (type: ShapeType | null) => void;
  addLabel: (label: string) => boolean;
  removeLabel: (label: string) => void;
  setSkipDeleteConfirm: (skip: boolean) => void;
  setMaskImage: (imageUrl: string | null) => void;
  getCurrentImageFile: () => File | null;
  getCurrentImageSize: () => { width: number; height: number } | null;
  reset: () => void;
}

const MAX_LABELS = 5;
const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

export const useImageAnnotationStore = create<ImageAnnotationState>(
  (set, get) => ({
    images: [],
    imageFiles: [],
    imageSizes: [],
    currentImageIndex: 0,
    annotations: [],
    selectedLabel: "",
    labels: [],
    tool: "select",
    annotationType: null,
    skipDeleteConfirm: false,
    maskImage: null,

    setImages: (images, files, sizes) =>
      set({
        images,
        imageFiles: files,
        imageSizes: sizes || [],
        currentImageIndex: 0,
        annotations: [],
        maskImage: null,
      }),

    addImage: (image, file, size) =>
      set((state) => ({
        images: [...state.images, image],
        imageFiles: file ? [...state.imageFiles, file] : state.imageFiles,
        imageSizes: size ? [...state.imageSizes, size] : state.imageSizes,
      })),

    setCurrentImageIndex: (index) =>
      set({ currentImageIndex: index, maskImage: null }),

    getCurrentImageFile: () => {
      const state = get();
      return state.imageFiles[state.currentImageIndex] || null;
    },

    getCurrentImageSize: () => {
      const state = get();
      return state.imageSizes[state.currentImageIndex] || null;
    },

    setMaskImage: (imageUrl) => set({ maskImage: imageUrl }),

    addAnnotation: (ann) =>
      set((state) => {
        const color =
          colors[state.labels.indexOf(state.selectedLabel) % colors.length];
        const newAnnotationType = state.annotationType || ann.type;
        return {
          annotations: [...state.annotations, { ...ann, color }],
          annotationType: newAnnotationType,
        };
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

    removeAnnotationsByImage: (imageIndex) =>
      set((state) => ({
        annotations: state.annotations.filter((a) => a.frameId !== imageIndex),
      })),

    setSelectedLabel: (label) => set({ selectedLabel: label }),
    setTool: (tool) => set({ tool }),
    setAnnotationType: (type) =>
      set({
        annotationType: type,
        tool: type as ShapeType,
      }),

    addLabel: (label) => {
      const state = get();
      if (state.labels.includes(label)) {
        return false;
      }
      if (state.labels.length >= MAX_LABELS) {
        return false;
      }
      set((state) => ({
        labels: [...state.labels, label],
        selectedLabel: label,
      }));
      return true;
    },

    removeLabel: (label) =>
      set((state) => {
        const newLabels = state.labels.filter((l) => l !== label);
        const newAnnotations = state.annotations.filter(
          (a) => a.label !== label,
        );
        return {
          labels: newLabels,
          annotations: newAnnotations,
          selectedLabel:
            state.selectedLabel === label
              ? newLabels[0] || ""
              : state.selectedLabel,
        };
      }),

    setSkipDeleteConfirm: (skip) => set({ skipDeleteConfirm: skip }),

    reset: () =>
      set({
        images: [],
        imageFiles: [],
        imageSizes: [],
        currentImageIndex: 0,
        annotations: [],
        selectedLabel: "",
        labels: [],
        tool: "select",
        annotationType: null,
        skipDeleteConfirm: false,
        maskImage: null,
      }),
  }),
);
