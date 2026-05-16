import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ShapeType = "rect" | "point";
export type TrackingStatus =
  | "idle"
  | "queued"
  | "processing"
  | "done"
  | "error";
export type ExportFormat = "yolo" | "coco" | "voc";

export interface Annotation {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  frameId: number;
  color: string;
}

export const ANNOTATION_COLORS = [
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
];
const MAX_LABELS = 5;

interface AppState {
  currentFile: string | null;
  currentVideoFile: File | null;
  firstFrameUrl: string | null;
  videoDimensions: { width: number; height: number } | null;
  currentFrame: number;
  videoFileName: string | null;
  annotations: Annotation[];
  labels: string[];
  selectedLabel: string;
  annotationType: ShapeType | null;
  skipDeleteConfirm: boolean;
  maskImage: string | null;
  taskId: string | null;
  trackingStatus: TrackingStatus;
  trackingError: string | null;
  trackingProgress: number | null;

  setFile: (
    url: string | null,
    file: File | null,
    fileName: string | null,
  ) => void;
  setCurrentVideoFile: (file: File | null) => void;
  setFirstFrameUrl: (url: string | null) => void;
  setVideoDimensions: (dims: { width: number; height: number } | null) => void;
  setVideoFileName: (name: string | null) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  removeAnnotationsByFrame: (frameId: number) => void;
  removeAnnotationsByLabel: (label: string) => void;
  addLabel: (label: string) => boolean;
  removeLabel: (label: string) => void;
  setSelectedLabel: (label: string) => void;
  setAnnotationType: (type: ShapeType | null) => void;
  setSkipDeleteConfirm: (skip: boolean) => void;
  setMaskImage: (url: string | null) => void;
  setTaskId: (id: string | null) => void;
  setTrackingStatus: (status: TrackingStatus) => void;
  setTrackingError: (err: string | null) => void;
  setTrackingProgress: (progress: number | null) => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentFile: null,
      currentVideoFile: null,
      firstFrameUrl: null,
      videoDimensions: null,
      currentFrame: 0,
      videoFileName: null,
      annotations: [],
      labels: [],
      selectedLabel: "",
      annotationType: null,
      skipDeleteConfirm: false,
      maskImage: null,
      taskId: null,
      trackingStatus: "idle",
      trackingError: null,
      trackingProgress: null,

      setFile: (url, file, fileName) =>
        set({
          currentFile: url,
          currentVideoFile: file,
          videoFileName: fileName,
          annotations: [],
          maskImage: null,
          firstFrameUrl: null,
          videoDimensions: null,
          taskId: null,
          trackingStatus: "idle",
          trackingProgress: null,
        }),

      setCurrentVideoFile: (file) => set({ currentVideoFile: file }),
      setFirstFrameUrl: (url) => set({ firstFrameUrl: url }),
      setVideoDimensions: (dims) => set({ videoDimensions: dims }),
      setVideoFileName: (name) => set({ videoFileName: name }),

      addAnnotation: (ann) =>
        set((state) => {
          const color =
            ANNOTATION_COLORS[
              state.labels.indexOf(state.selectedLabel) %
                ANNOTATION_COLORS.length
            ];
          return {
            annotations: [...state.annotations, { ...ann, color }],
            annotationType: state.annotationType ?? ann.type,
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

      removeAnnotationsByFrame: (frameId) =>
        set((state) => ({
          annotations: state.annotations.filter((a) => a.frameId !== frameId),
        })),

      removeAnnotationsByLabel: (label) =>
        set((state) => ({
          annotations: state.annotations.filter((a) => a.label !== label),
        })),

      addLabel: (label) => {
        const state = get();
        if (state.labels.includes(label) || state.labels.length >= MAX_LABELS)
          return false;
        set((s) => ({ labels: [...s.labels, label], selectedLabel: label }));
        return true;
      },

      removeLabel: (label) =>
        set((state) => {
          const newLabels = state.labels.filter((l) => l !== label);
          return {
            labels: newLabels,
            annotations: state.annotations.filter((a) => a.label !== label),
            selectedLabel:
              state.selectedLabel === label
                ? (newLabels[0] ?? "")
                : state.selectedLabel,
          };
        }),

      setSelectedLabel: (label) => set({ selectedLabel: label }),
      setAnnotationType: (type) => set({ annotationType: type }),
      setSkipDeleteConfirm: (skip) => set({ skipDeleteConfirm: skip }),
      setMaskImage: (url) => set({ maskImage: url }),
      setTaskId: (id) => set({ taskId: id }),
      setTrackingStatus: (status) => set({ trackingStatus: status }),
      setTrackingError: (err) => set({ trackingError: err }),
      setTrackingProgress: (progress) => set({ trackingProgress: progress }),

      reset: () =>
        set({
          currentFile: null,
          currentVideoFile: null,
          firstFrameUrl: null,
          videoDimensions: null,
          annotations: [],
          videoFileName: null,
          taskId: null,
          trackingStatus: "idle",
          maskImage: null,
          trackingProgress: null,
        }),
    }),
    {
      name: "annotation-store",
      partialize: (state) => ({
        firstFrameUrl: state.firstFrameUrl,
        videoDimensions: state.videoDimensions,
        videoFileName: state.videoFileName,
        annotations: state.annotations,
        labels: state.labels,
        selectedLabel: state.selectedLabel,
        annotationType: state.annotationType,
        skipDeleteConfirm: state.skipDeleteConfirm,
        taskId: state.taskId,
        trackingStatus: state.trackingStatus,
        trackingProgress: state.trackingProgress,
      }),
    },
  ),
);
