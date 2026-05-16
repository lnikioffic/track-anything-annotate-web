import React, { useEffect, useMemo, useRef, useState } from "react";
import UploadZone from "../components/UploadZone";
import Annotator from "../components/annotation/Annotator";
import { Button } from "../components/ui/Button";
import { useStore } from "../store/annotationStore";
import type { Annotation, ExportFormat } from "../store/annotationStore";
import { previewService } from "../services/previewService";
import { filePersistence } from "../lib/filePersistence";
import {
  annotationsToBackendFormat,
  calculateScaleParams,
  cn,
} from "../lib/utils";
import {
  Box,
  Crosshair,
  Play,
  Download,
  Wand2,
  Loader2,
  X,
  Upload,
  Menu,
} from "lucide-react";

const CANVAS_W = 800;
const CANVAS_H = 500;

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: "destructive" | "default";
  onConfirm(): void;
  onCancel(): void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  body,
  confirmLabel = "Подтвердить",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="text-sm text-gray-600 mb-4">{body}</div>
      <div className="flex gap-2">
        <Button variant={confirmVariant} onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </div>
  </div>
);

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  highlightedAnnotationId: string | null;
  setHighlightedAnnotationId: (id: string | null) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  highlightedAnnotationId,
  setHighlightedAnnotationId,
}) => {
  const {
    labels,
    selectedLabel,
    setSelectedLabel,
    addLabel,
    removeLabel,
    skipDeleteConfirm,
    setSkipDeleteConfirm,
    annotations,
    currentFrame,
    removeAnnotation,
    removeAnnotationsByFrame,
    annotationType,
    setAnnotationType,
  } = useStore();

  const frameAnnotations = useMemo(
    () => annotations.filter((a) => a.frameId === currentFrame),
    [annotations, currentFrame],
  );

  const annotationsByLabel = useMemo(() => {
    const map = new Map<string, number>();
    frameAnnotations.forEach((a) =>
      map.set(a.label, (map.get(a.label) ?? 0) + 1),
    );
    return map;
  }, [frameAnnotations]);

  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [deleteClassConfirm, setDeleteClassConfirm] = useState<string | null>(
    null,
  );
  const [deleteAnnConfirm, setDeleteAnnConfirm] = useState<Annotation | null>(
    null,
  );
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const handleAddLabel = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setError("Введите название класса");
      return;
    }
    if (trimmed.length > 20) {
      setError("Слишком длинное название");
      return;
    }
    if (!addLabel(trimmed)) {
      setError("Класс уже существует или достигнут лимит (5)");
    } else {
      setNewLabel("");
      setError("");
    }
  };

  const handleRemoveAnnotation = (ann: Annotation) => {
    if (skipDeleteConfirm) removeAnnotation(ann.id);
    else setDeleteAnnConfirm(ann);
  };

  const handleRemoveLabel = (label: string) => {
    if (skipDeleteConfirm) removeLabel(label);
    else setDeleteClassConfirm(label);
  };

  const handleRemoveAll = () => {
    if (skipDeleteConfirm) removeAnnotationsByFrame(currentFrame);
    else setDeleteAllConfirm(true);
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow border h-full min-w-[300px] overflow-hidden">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">
        ИНСТРУМЕНТЫ
      </h3>

      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">
          ТИП РАЗМЕТКИ
        </h4>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          {(["rect", "point"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAnnotationType(annotationType === t ? null : t)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer select-none",
                annotationType === t
                  ? "bg-white text-primary shadow-sm font-medium"
                  : "text-gray-600 hover:bg-white/60 hover:text-gray-900",
              )}
            >
              {t === "rect" ? (
                <>
                  <Box size={14} /> Рамки
                </>
              ) : (
                <>
                  <Crosshair size={14} /> Точки
                </>
              )}
            </button>
          ))}
        </div>
        {annotationType && (
          <p className="text-[10px] text-muted-foreground mt-1 px-1">
            Режим:{" "}
            <strong>{annotationType === "rect" ? "рамки" : "точки"}</strong>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">
          КЛАССЫ ({labels.length}/5)
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => {
              setNewLabel(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
            placeholder="Название класса"
            className="flex-1 px-3 py-2 text-sm border rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            disabled={labels.length >= 5}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddLabel}
            disabled={labels.length >= 5}
          >
            +
          </Button>
        </div>
        {error && <p className="text-[10px] text-destructive px-1">{error}</p>}
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none hover:text-gray-700 transition-colors">
        <input
          type="checkbox"
          checked={skipDeleteConfirm}
          onChange={(e) => setSkipDeleteConfirm(e.target.checked)}
          className="rounded border-gray-300 cursor-pointer"
        />
        Не спрашивать подтверждение
      </label>

      <div className="flex flex-col gap-1 overflow-y-auto max-h-[160px] pr-1">
        {labels.map((label) => (
          <div
            key={label}
            className={cn(
              "group flex items-center justify-between px-3 py-2 rounded text-sm transition-all border",
              selectedLabel === label
                ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                : "hover:bg-gray-50 border-transparent",
            )}
          >
            <button
              onClick={() => setSelectedLabel(label)}
              className="flex-1 text-left truncate cursor-pointer"
            >
              {label}{" "}
              {(annotationsByLabel.get(label) ?? 0) > 0 && (
                <span className="text-[10px] opacity-60">
                  ({annotationsByLabel.get(label)})
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveLabel(label);
              }}
              className="relative z-20 ml-2 p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {frameAnnotations.length > 0 && (
        <div className="mt-2 pt-4 border-t flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="font-semibold text-[11px] text-gray-500 uppercase">
              НА КАДРЕ ({frameAnnotations.length}/10)
            </h4>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs h-8 shrink-0"
            onClick={handleRemoveAll}
          >
            Удалить все ({frameAnnotations.length})
          </Button>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
            {frameAnnotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  "group flex items-center justify-between px-2 py-1.5 text-xs border rounded cursor-pointer transition-colors",
                  highlightedAnnotationId === ann.id
                    ? "bg-blue-100 border-blue-500"
                    : "bg-white hover:border-gray-300",
                )}
                onMouseEnter={() => setHighlightedAnnotationId(ann.id)}
                onMouseLeave={() => setHighlightedAnnotationId(null)}
              >
                <span className="truncate font-medium flex-1">{ann.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAnnotation(ann);
                  }}
                  className="relative z-20 ml-2 p-1 hover:bg-red-100 rounded text-red-600 shrink-0 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center italic mt-1 shrink-0">
            Наведите для подсветки на канвасе
          </p>
        </div>
      )}

      {deleteClassConfirm && (
        <ConfirmDialog
          title="Удалить класс?"
          body={
            <>
              Класс «<strong>{deleteClassConfirm}</strong>» и все его аннотации
              будут удалены.
            </>
          }
          confirmLabel="Удалить"
          onConfirm={() => {
            removeLabel(deleteClassConfirm);
            setDeleteClassConfirm(null);
          }}
          onCancel={() => setDeleteClassConfirm(null)}
        />
      )}

      {deleteAnnConfirm && (
        <ConfirmDialog
          title="Удалить аннотацию?"
          body={
            <>
              Аннотация «<strong>{deleteAnnConfirm.label}</strong>» будет
              удалена.
            </>
          }
          confirmLabel="Удалить"
          onConfirm={() => {
            removeAnnotation(deleteAnnConfirm.id);
            setDeleteAnnConfirm(null);
          }}
          onCancel={() => setDeleteAnnConfirm(null)}
        />
      )}

      {deleteAllConfirm && (
        <ConfirmDialog
          title="Удалить всё?"
          body={
            <>
              Все аннотации на этом кадре будут удалены. Это действие нельзя
              отменить.
            </>
          }
          confirmLabel="Удалить всё"
          onConfirm={() => {
            removeAnnotationsByFrame(currentFrame);
            setDeleteAllConfirm(false);
          }}
          onCancel={() => setDeleteAllConfirm(false)}
        />
      )}
    </div>
  );
};

// ─── VideoAnnotation ──────────────────────────────────────────────────────────

const VideoAnnotation = () => {
  const {
    currentFile,
    setFile,
    currentVideoFile,
    setCurrentVideoFile,
    firstFrameUrl,
    setFirstFrameUrl,
    videoDimensions,
    setVideoDimensions,
    videoFileName,
    annotations,
    currentFrame,
    addAnnotation,
    labels,
    addLabel,
    annotationType,
    maskImage,
    setMaskImage,
    taskId,
    setTaskId,
    trackingStatus,
    setTrackingStatus,
    trackingError,
    setTrackingError,
    trackingProgress,
    setTrackingProgress,
    skipDeleteConfirm,
    reset,
  } = useStore();

  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<
    string | null
  >(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("yolo");
  const [isGeneratingMask, setIsGeneratingMask] = useState(false);
  const [maskError, setMaskError] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [trackingConfirm, setTrackingConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isRestoring, setIsRestoring] = useState(true);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Адаптивный масштаб
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0)
        setCanvasScale(Math.min(1, w / CANVAS_W, h / CANVAS_H));
    };
    const obs = new ResizeObserver(updateScale);
    obs.observe(el);
    updateScale();
    return () => obs.disconnect();
  }, [firstFrameUrl]);

  // 2. Скрытие маски при изменении аннотаций (исправляет фантомные маски)
  useEffect(() => {
    if (maskImage) {
      setMaskImage(null);
      filePersistence.clearMask();
    }
  }, [annotations.length, labels.length]);

  // 3. Восстановление состояния из IndexedDB
  useEffect(() => {
    const attemptRestore = async () => {
      if (!currentVideoFile && videoFileName) {
        const file = await filePersistence.getVideo();
        if (file && file.name === videoFileName) setCurrentVideoFile(file);
      }
      const maskBlob = await filePersistence.getMask();
      if (maskBlob && !maskImage) {
        setMaskImage(URL.createObjectURL(maskBlob));
      }
      setIsRestoring(false);
    };
    attemptRestore();
  }, []);

  // 4. Возобновление поллинга
  useEffect(() => {
    if (
      taskId &&
      (trackingStatus === "processing" || trackingStatus === "queued")
    ) {
      startPolling(taskId);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [taskId]);

  const frameAnnotations = useMemo(
    () => annotations.filter((a: Annotation) => a.frameId === currentFrame),
    [annotations, currentFrame],
  );

  const hasAnnotations = frameAnnotations.length > 0;

  const handleUpload = async (file: File) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    await filePersistence.saveVideo(file);

    if (videoFileName === file.name && firstFrameUrl) {
      setCurrentVideoFile(file);
      return;
    }

    const url = URL.createObjectURL(file);
    setFile(url, file, file.name);
    setVideoError(null);
    setMaskError("");

    try {
      const dataUrl = await previewService.extractFirstFrame(file);
      setFirstFrameUrl(dataUrl);
      const img = new Image();
      img.onload = () =>
        setVideoDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      img.src = dataUrl;
    } catch (err) {
      setVideoError("Не удалось извлечь первый кадр");
    }
  };

  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    const currentP = useStore.getState().trackingProgress || 0;
    let tick =
      currentP > 0
        ? Math.round(-Math.log(1 - Math.min(currentP, 89) / 90) / 0.12)
        : 0;
    if (isNaN(tick) || tick < 0) tick = 0;

    pollingRef.current = setInterval(async () => {
      tick++;
      const simProgress = Math.round(90 * (1 - Math.exp(-tick * 0.12)));
      try {
        const res = await fetch(`/api/v1/progress/${id}`);
        const data = await res.json();
        const actualProgress = data.progress ?? simProgress;
        setTrackingProgress(
          Math.max(actualProgress, useStore.getState().trackingProgress || 0),
        );

        if (data.status === "done") {
          setTrackingStatus("done");
          setTrackingProgress(100);
          clearInterval(pollingRef.current!);
        } else if (data.status === "error" || data.status === "cancelled") {
          setTrackingStatus(data.status === "error" ? "error" : "idle");
          clearInterval(pollingRef.current!);
        }
      } catch {
        setTrackingProgress(simProgress);
      }
    }, 2000);
  };

  const handleGenerateMask = async () => {
    if (!hasAnnotations || !firstFrameUrl) return;
    setIsGeneratingMask(true);
    setMaskError("");
    try {
      const res = await fetch(firstFrameUrl);
      const blob = await res.blob();
      const frameFile = new File([blob], "frame.jpg", { type: "image/jpeg" });
      const scaleParams = calculateScaleParams(
        CANVAS_W,
        CANVAS_H,
        videoDimensions?.width || 1920,
        videoDimensions?.height || 1080,
      );
      const prompt = annotationsToBackendFormat(
        frameAnnotations,
        0,
        null,
        scaleParams,
      );

      const response = await previewService.generateMaskPreview(
        frameFile,
        prompt,
      );
      await filePersistence.saveMask(response.blob);
      setMaskImage(response.imageUrl);
    } catch {
      setMaskError("Ошибка генерации маски");
    } finally {
      setIsGeneratingMask(false);
    }
  };

  const handleStartTracking = async () => {
    setTrackingConfirm(false);
    if (!currentVideoFile || !hasAnnotations) return;
    setTrackingStatus("queued");
    setTrackingError(null);

    try {
      const scaleParams = calculateScaleParams(
        CANVAS_W,
        CANVAS_H,
        videoDimensions?.width || 1920,
        videoDimensions?.height || 1080,
      );
      const prompt = annotationsToBackendFormat(
        frameAnnotations,
        0,
        null,
        scaleParams,
      );
      const formData = new FormData();
      formData.append("file", currentVideoFile);
      formData.append(
        "metadata",
        JSON.stringify({ type: exportFormat, prompt }),
      );

      const res = await fetch("/api/v1/tracking", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTaskId(data.task_id);
      startPolling(data.task_id);
    } catch (err) {
      setTrackingStatus("error");
      setTrackingError("Ошибка запуска трекинга");
    }
  };

  const handleCancelTracking = async () => {
    setCancelConfirm(false);
    if (taskId)
      try {
        await fetch(`/api/v1/cancel/${taskId}`, { method: "POST" });
      } catch {}
    if (pollingRef.current) clearInterval(pollingRef.current);
    setTrackingStatus("idle");
    setTaskId(null);
    setTrackingProgress(null);
    setMaskImage(null);
    filePersistence.clearMask();
  };

  const handleDownload = async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/v1/download/${taskId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dataset_${taskId}.zip`;
      a.click();
    } catch {
      setTrackingError("Ошибка скачивания");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed: Array<{
          class_name: string;
          prompt: {
            mode: string;
            point_coords?: number[][];
            boxes?: number[][];
          };
        }> = JSON.parse(ev.target?.result as string);
        for (const item of parsed) {
          const label = item.class_name;
          if (!labels.includes(label)) {
            if (labels.length < 5) addLabel(label);
            else continue;
          }
          if (item.prompt.point_coords) {
            for (const [x, y] of item.prompt.point_coords) {
              addAnnotation({
                id: Math.random().toString(36).substring(2, 11),
                type: "point",
                x,
                y,
                label,
                frameId: 0,
                color: "#fff",
              });
            }
          }
          if (item.prompt.boxes) {
            for (const [x1, y1, x2, y2] of item.prompt.boxes) {
              addAnnotation({
                id: Math.random().toString(36).substring(2, 11),
                type: "rect",
                x: x1,
                y: y1,
                width: x2 - x1,
                height: y2 - y1,
                label,
                frameId: 0,
                color: "#fff",
              });
            }
          }
        }
      } catch {
        alert("Ошибка JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetVideo = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (currentFile) URL.revokeObjectURL(currentFile);
    filePersistence.clearAll();
    reset();
  };

  if (!videoFileName && !firstFrameUrl) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-3">Разметка видео</h1>
        <p className="text-muted-foreground mb-8">
          Загрузите видеофайл, разметьте первый кадр — SAM 2 + XMem
          автоматически соберёт датасет.
        </p>
        <UploadZone
          label="Загрузить видео (MP4, AVI, MOV, MKV)"
          accept={{ "video/*": [] }}
          onUpload={handleUpload}
        />
      </div>
    );
  }

  const isTracking =
    trackingStatus === "queued" || trackingStatus === "processing";

  return (
    <div className="flex flex-col md:flex-row h-full p-3 md:p-4 gap-3 md:gap-4 bg-gray-50 overflow-hidden">
      {/* МОБИЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ */}
      <div className="md:hidden flex items-center justify-between bg-white rounded-lg shadow border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Menu size={18} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Инструменты</span>
        </div>
        <button
          onClick={() => setToolbarOpen(!toolbarOpen)}
          className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md transition-colors active:scale-95"
        >
          {toolbarOpen ? "Скрыть" : "Показать"}
        </button>
      </div>

      <div
        className={cn(
          "w-fit shrink-0 overflow-hidden transition-all",
          toolbarOpen ? "block" : "hidden md:block",
        )}
      >
        <Toolbar
          highlightedAnnotationId={highlightedAnnotationId}
          setHighlightedAnnotationId={setHighlightedAnnotationId}
        />
      </div>

      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
        {/* Инфо-панель */}
        <div className="bg-white rounded-lg shadow border px-4 py-2 flex items-center justify-between text-sm shrink-0">
          <div className="flex items-center gap-4 truncate">
            <span className="font-bold text-gray-700 truncate">
              {videoFileName}
            </span>
            {videoDimensions && (
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {videoDimensions.width} × {videoDimensions.height}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetVideo}
            className="ml-4 h-8 shrink-0"
          >
            Сменить видео
          </Button>
        </div>

        {/* Панель действий */}
        <div className="bg-white rounded-lg shadow border px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              disabled={trackingStatus !== "idle"}
              className="text-sm border rounded-md px-2 py-2 outline-none focus:ring-1 focus:ring-primary shrink-0"
            >
              <option value="yolo">YOLO</option>
              <option value="coco">COCO</option>
              <option value="voc">VOC</option>
            </select>

            {trackingStatus === "idle" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 shrink-0"
                onClick={handleGenerateMask}
                disabled={isGeneratingMask || !hasAnnotations}
              >
                {isGeneratingMask ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}{" "}
                Превью маски
              </Button>
            )}

            {maskImage && trackingStatus === "idle" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => setMaskImage(null)}
              >
                Скрыть маску
              </Button>
            )}

            <div className="h-6 w-px bg-gray-200 shrink-0" />

            {trackingStatus === "idle" && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 gap-2 shrink-0"
                onClick={() =>
                  skipDeleteConfirm
                    ? handleStartTracking()
                    : setTrackingConfirm(true)
                }
                disabled={
                  !hasAnnotations || !annotationType || !currentVideoFile
                }
              >
                <Play size={14} /> Запустить трекинг
              </Button>
            )}

            {isTracking && (
              <div className="flex items-center gap-3 shrink-0 px-1">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-base font-bold text-blue-600">
                  {trackingProgress || 0}%
                </span>
                <div className="h-6 w-px bg-gray-200 mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-300"
                  onClick={() => setCancelConfirm(true)}
                >
                  Отмена
                </Button>
              </div>
            )}

            {trackingStatus === "done" && (
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-green-600 text-sm font-bold flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />{" "}
                  Готово
                </span>
                <Button
                  size="sm"
                  className="bg-green-600 text-white h-9 px-4 shrink-0 gap-2"
                  onClick={handleDownload}
                >
                  <Download size={14} /> Скачать датасет
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={handleCancelTracking}
                >
                  Новый трекинг
                </Button>
              </div>
            )}
          </div>

          <div className="shrink-0 border-l pl-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              Импорт JSON
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>

        {maskError && (
          <p className="text-xs text-destructive bg-red-50 border p-2 rounded">
            {maskError}
          </p>
        )}
        {videoError && (
          <p className="text-xs text-destructive bg-red-50 border p-2 rounded">
            {videoError}
          </p>
        )}

        {/* Канвас */}
        <div
          ref={canvasContainerRef}
          className="w-full md:flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-200 overflow-hidden relative"
        >
          {firstFrameUrl ? (
            <>
              <Annotator
                imageUrl={firstFrameUrl}
                width={CANVAS_W}
                height={CANVAS_H}
                scale={canvasScale}
                highlightedAnnotationId={highlightedAnnotationId}
                maskImageUrl={maskImage}
              />
              {!isRestoring &&
                !currentVideoFile &&
                trackingStatus === "idle" && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm text-center mx-4 border">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload size={32} />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        Файл не выбран
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        После перезагрузки страницы нужно снова выбрать
                        видеофайл <strong>{videoFileName}</strong> для запуска
                        трекинга.
                      </p>
                      <input
                        type="file"
                        id="re-upload"
                        className="hidden"
                        accept="video/*"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUpload(e.target.files[0])
                        }
                      />
                      <Button
                        size="lg"
                        className="w-full bg-blue-600 text-white font-bold shadow-lg shadow-primary/20"
                        onClick={() =>
                          document.getElementById("re-upload")?.click()
                        }
                      >
                        Выбрать видео
                      </Button>
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
              <p className="font-medium text-lg">Извлечение кадра...</p>
            </div>
          )}
        </div>

        {/* Подсказки */}
        {firstFrameUrl &&
          !currentVideoFile &&
          trackingStatus === "idle" &&
          !isRestoring && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-center shrink-0">
              Видео не загружено. Нажмите «Сменить видео» и загрузите файл
              снова, чтобы запустить трекинг.
            </p>
          )}
        {hasAnnotations && trackingStatus === "idle" && !annotationType && (
          <p className="text-xs text-amber-600 text-center shrink-0">
            Выберите тип разметки (рамки или точки) для запуска трекинга
          </p>
        )}
      </div>

      {/* ДИАЛОГИ ПОДТВЕРЖДЕНИЯ */}
      {trackingConfirm && (
        <ConfirmDialog
          title="Запустить трекинг?"
          confirmLabel="Подтвердить"
          confirmVariant="default"
          body={
            <>
              Видео будет отправлено на сервер для обработки. Это может занять
              несколько минут.
              <br />
              <span className="text-[11px] text-muted-foreground mt-2 block">
                Формат датасета: <strong>{exportFormat.toUpperCase()}</strong>
                {" · "}
                Тип аннотаций:{" "}
                <strong>{annotationType === "rect" ? "рамки" : "точки"}</strong>
              </span>
            </>
          }
          onConfirm={handleStartTracking}
          onCancel={() => setTrackingConfirm(false)}
        />
      )}

      {cancelConfirm && (
        <ConfirmDialog
          title="Отменить трекинг?"
          body="Вы уверены? Прогресс обработки на сервере будет потерян."
          confirmVariant="destructive"
          confirmLabel="Прервать"
          onConfirm={handleCancelTracking}
          onCancel={() => setCancelConfirm(false)}
        />
      )}
    </div>
  );
};

export default VideoAnnotation;
