import { create } from "zustand";
import type { Annotation, ShapeType } from "./annotationStore";

interface ImageAnnotationState {
  images: string[];
  currentImageIndex: number;
  annotations: Annotation[];
  selectedLabel: string;
  labels: string[];
  tool: ShapeType | "select";
  annotationType: ShapeType | null;
  skipDeleteConfirm: boolean;

  setImages: (images: string[]) => void;
  addImage: (image: string) => void;
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
  reset: () => void;
}

const MAX_LABELS = 5;
const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

export const useImageAnnotationStore = create<ImageAnnotationState>(
  (set, get) => ({
    images: [],
    currentImageIndex: 0,
    annotations: [],
    selectedLabel: "",
    labels: [],
    tool: "select",
    annotationType: null,
    skipDeleteConfirm: false,

    setImages: (images) =>
      set({
        images,
        currentImageIndex: 0,
        annotations: [],
      }),

    addImage: (image) =>
      set((state) => ({
        images: [...state.images, image],
      })),

    setCurrentImageIndex: (index) => set({ currentImageIndex: index }),

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
        currentImageIndex: 0,
        annotations: [],
        selectedLabel: "",
        labels: [],
        tool: "select",
        annotationType: null,
        skipDeleteConfirm: false,
      }),
  }),
);
