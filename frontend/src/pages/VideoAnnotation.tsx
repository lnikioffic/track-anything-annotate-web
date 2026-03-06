import React from "react";
import { useState } from "react";
import UploadZone from "../components/UploadZone";
import Annotator from "../components/annotation/Annotator";
import { Button } from "../components/ui/Button";
import { useStore } from "../store/annotationStore";
import { Box, Crosshair, Play, Save, Download, Upload } from "lucide-react";
import type { Annotation } from "../store/annotationStore";
import {
  cn,
  exportAnnotationsToJson,
  importAnnotationsFromJson,
} from "../lib/utils";

// Компонент тулбара
interface ToolbarProps {
  labels: string[];
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
  addLabel: (label: string) => boolean;
  removeLabel: (label: string) => void;
  skipDeleteConfirm: boolean;
  setSkipDeleteConfirm: (skip: boolean) => void;
  frameAnnotations: Annotation[];
  annotationsByLabel: Map<string, number>;
  currentFrame: number;
  removeAnnotation: (id: string) => void;
  removeAnnotationsByFrame: (frameId: number) => void;
  highlightedAnnotationId: string | null;
  setHighlightedAnnotationId: (id: string | null) => void;
  annotationType: "rect" | "point" | null;
  setAnnotationType: (type: "rect" | "point" | null) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  labels,
  selectedLabel,
  setSelectedLabel,
  addLabel,
  removeLabel,
  skipDeleteConfirm,
  setSkipDeleteConfirm,
  frameAnnotations,
  annotationsByLabel,
  currentFrame,
  removeAnnotation,
  removeAnnotationsByFrame,
  highlightedAnnotationId,
  setHighlightedAnnotationId,
  annotationType,
  setAnnotationType,
}) => {
  const [newLabel, setNewLabel] = React.useState("");
  const [error, setError] = React.useState("");
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [deleteAnnotationConfirm, setDeleteAnnotationConfirm] = React.useState<{
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = React.useState(false);

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
    const success = addLabel(trimmed);
    if (!success) {
      setError("Класс существует или достигнут лимит (5)");
    } else {
      setNewLabel("");
      setError("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddLabel();
    }
  };

  const handleRemoveLabel = (label: string) => {
    if (skipDeleteConfirm) {
      removeLabel(label);
    } else {
      setDeleteConfirm(label);
    }
  };

  const confirmRemoveLabel = () => {
    if (deleteConfirm) {
      removeLabel(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleRemoveAnnotation = (ann: Annotation) => {
    if (skipDeleteConfirm) {
      removeAnnotation(ann.id);
    } else {
      setDeleteAnnotationConfirm({
        id: ann.id,
        label: ann.label,
        type: ann.type,
        x: ann.type === "rect" ? ann.x + (ann.width || 0) / 2 : ann.x,
        y: ann.type === "rect" ? ann.y + (ann.height || 0) / 2 : ann.y,
      });
    }
  };

  const confirmRemoveAnnotation = () => {
    if (deleteAnnotationConfirm) {
      removeAnnotation(deleteAnnotationConfirm.id);
      setDeleteAnnotationConfirm(null);
    }
  };

  const handleRemoveAllAnnotations = () => {
    if (skipDeleteConfirm) {
      removeAnnotationsByFrame(currentFrame);
    } else {
      setDeleteAllConfirm(true);
    }
  };

  const confirmRemoveAllAnnotations = () => {
    removeAnnotationsByFrame(currentFrame);
    setDeleteAllConfirm(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow border h-fit">
      <h3 className="font-semibold text-sm mb-2 text-gray-500">ИНСТРУМЕНТЫ</h3>

      {/* Переключатель типа разметки */}
      <div className="mb-2">
        <h4 className="text-xs font-medium text-gray-500 mb-2">ТИП РАЗМЕТКИ</h4>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          <button
            onClick={() => setAnnotationType("rect")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors",
              annotationType === "rect"
                ? "bg-white text-primary shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Box size={14} /> Рамки
          </button>
          <button
            onClick={() => setAnnotationType("point")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors",
              annotationType === "point"
                ? "bg-white text-primary shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            <Crosshair size={14} /> Точки
          </button>
        </div>
        {annotationType && (
          <p className="text-xs text-muted-foreground mt-1">
            Активен режим:{" "}
            <strong>{annotationType === "rect" ? "рамки" : "точки"}</strong>
          </p>
        )}
      </div>

      <h3 className="font-semibold text-sm mb-2 mt-4 text-gray-500">
        КЛАССЫ ({labels.length}/5)
      </h3>

      {/* Форма добавления класса */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Название класса"
          className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={labels.length >= 5}
        />
        <Button
          variant="default"
          size="sm"
          onClick={handleAddLabel}
          disabled={labels.length >= 5}
        >
          +
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {labels.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          ⚠️ Добавьте хотя бы один класс для начала разметки
        </p>
      )}

      {/* Опция пропуска подтверждения */}
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={skipDeleteConfirm}
          onChange={(e) => setSkipDeleteConfirm(e.target.checked)}
          className="rounded border-gray-300"
        />
        Не спрашивать подтверждение
      </label>

      <div className="flex flex-col gap-2">
        {labels.map((label) => {
          const count = annotationsByLabel.get(label) || 0;
          return (
            <div
              key={label}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded text-sm transition-colors border",
                selectedLabel === label
                  ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                  : "hover:bg-gray-50 border-transparent",
              )}
            >
              <button
                onClick={() => setSelectedLabel(label)}
                className="flex-1 text-left"
              >
                {label}{" "}
                {count > 0 && (
                  <span className="text-xs opacity-60">({count})</span>
                )}
              </button>
              <button
                onClick={() => handleRemoveLabel(label)}
                className="ml-2 p-1 hover:bg-red-100 rounded text-red-600"
                title="Удалить класс и все аннотации"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Удаление всех аннотаций на кадре */}
      {frameAnnotations.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleRemoveAllAnnotations}
          >
            Удалить все аннотации на кадре ({frameAnnotations.length})
          </Button>
        </div>
      )}

      {/* Список аннотаций на кадре с возможностью удаления и подсветкой */}
      {frameAnnotations.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-xs text-gray-500">
              АННОТАЦИИ НА КАДРЕ ({frameAnnotations.length}/10)
            </h4>
            {frameAnnotations.length >= 10 && (
              <span className="text-xs text-amber-600 font-medium">
                ⚠️ Лимит
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {frameAnnotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  "flex items-center justify-between px-2 py-1 text-xs border rounded cursor-pointer transition-colors",
                  highlightedAnnotationId === ann.id
                    ? "bg-blue-100 border-blue-500"
                    : "hover:bg-gray-50",
                )}
                onMouseEnter={() => setHighlightedAnnotationId(ann.id)}
                onMouseLeave={() => setHighlightedAnnotationId(null)}
              >
                <div className="truncate flex-1">
                  <div className="font-medium">{ann.label}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAnnotation(ann);
                  }}
                  className="ml-2 p-1 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                  title="Удалить аннотацию"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Наведите на объект для подсветки на изображении
          </p>
        </div>
      )}

      {/* Диалог подтверждения удаления класса */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-lg mb-2">
              Подтверждение удаления
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Удалить класс "<strong>{deleteConfirm}</strong>" и все его
              аннотации ({annotationsByLabel.get(deleteConfirm) || 0})?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={confirmRemoveLabel}
                className="flex-1"
              >
                Удалить
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог подтверждения удаления аннотации */}
      {deleteAnnotationConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-lg mb-2">
              Подтверждение удаления
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Удалить аннотацию "
              <strong>{deleteAnnotationConfirm.label}</strong>"?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={confirmRemoveAnnotation}
                className="flex-1"
              >
                Удалить
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteAnnotationConfirm(null)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог подтверждения удаления всех аннотаций */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-lg mb-2">
              Подтверждение удаления
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Удалить все аннотации на кадре ({frameAnnotations.length})?
              <br />
              <span className="text-xs text-destructive">
                Это действие нельзя отменить
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={confirmRemoveAllAnnotations}
                className="flex-1"
              >
                Удалить всё
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteAllConfirm(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VideoAnnotation = () => {
  const {
    currentFile,
    setFile,
    labels,
    selectedLabel,
    setSelectedLabel,
    startProcessing,
    isProcessing,
    processingProgress,
    currentFrame,
    setCurrentFrame,
    totalFrames,
    annotations,
    addAnnotation,
    addLabel,
    removeLabel,
    skipDeleteConfirm,
    setSkipDeleteConfirm,
    removeAnnotation,
    removeAnnotationsByFrame,
    annotationType,
    setAnnotationType,
  } = useStore();

  const [highlightedAnnotationId, setHighlightedAnnotationId] = React.useState<
    string | null
  >(null);
  const [trackingConfirm, setTrackingConfirm] = React.useState(false);
  const [exportFormat, setExportFormat] = useState<
    "json" | "yolo" | "coco" | "voc"
  >("json");

  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setFile(url, "video");
  };

  // Проверка наличия аннотаций на текущем кадре
  const frameAnnotations = annotations.filter(
    (a: Annotation) => a.frameId === currentFrame,
  );
  const annotationsByLabel = new Map<string, number>();
  frameAnnotations.forEach((a: Annotation) => {
    annotationsByLabel.set(a.label, (annotationsByLabel.get(a.label) || 0) + 1);
  });
  // Проверяем наличие аннотаций текущего выбранного типа
  const hasAnnotations = frameAnnotations.some(
    (a) => annotationType === null || a.type === annotationType,
  );

  // Запуск трекинга с подтверждением
  const handleStartTracking = () => {
    if (skipDeleteConfirm) {
      startProcessing();
    } else {
      setTrackingConfirm(true);
    }
  };

  const confirmStartTracking = () => {
    startProcessing();
    setTrackingConfirm(false);
  };

  // Экспорт аннотаций в выбранном формате
  const handleExport = () => {
    const json = exportAnnotationsToJson(
      annotations,
      currentFrame,
      annotationType,
      exportFormat,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annotations_frame_${currentFrame}.${exportFormat === "yolo" ? "txt" : exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Импорт аннотаций из JSON
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedAnnotations = importAnnotationsFromJson(
          json,
          currentFrame,
        );
        // Добавляем импортированные аннотации
        for (const ann of importedAnnotations) {
          addAnnotation(ann);
        }
      } catch (error) {
        console.error("Ошибка импорта аннотаций:", error);
        alert("Неверный формат JSON файла");
      }
    };
    reader.readAsText(file);
    // Сбрасываем input для возможности повторной загрузки того же файла
    event.target.value = "";
  };

  if (!currentFile) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Разметка видео</h1>
        <p className="text-muted-foreground mb-8">
          Загрузите видеофайл для начала трекинга. Вы сможете разметить первый
          кадр, а ML-ядро автоматически отследит объекты на всем видео.
        </p>
        <UploadZone
          label="Загрузить видео (MP4, AVI, MKV)"
          accept={{ "video/*": [] }}
          onUpload={handleUpload}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full p-6 gap-6 bg-gray-50">
      {/* Левая панель - Инструменты */}
      <div className="w-64 flex-shrink-0">
        <Toolbar
          labels={labels}
          selectedLabel={selectedLabel}
          setSelectedLabel={setSelectedLabel}
          addLabel={addLabel}
          removeLabel={removeLabel}
          skipDeleteConfirm={skipDeleteConfirm}
          setSkipDeleteConfirm={setSkipDeleteConfirm}
          frameAnnotations={frameAnnotations}
          annotationsByLabel={annotationsByLabel}
          currentFrame={currentFrame}
          removeAnnotation={removeAnnotation}
          removeAnnotationsByFrame={removeAnnotationsByFrame}
          highlightedAnnotationId={highlightedAnnotationId}
          setHighlightedAnnotationId={setHighlightedAnnotationId}
          annotationType={annotationType}
          setAnnotationType={setAnnotationType}
        />
      </div>

      {/* Центральная часть - Канвас */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white rounded-lg shadow p-1 flex justify-between items-center border">
          <div className="text-sm font-medium px-4">
            Frame: {currentFrame} / {totalFrames}
          </div>
          {processingProgress === 100 && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={totalFrames}
                value={currentFrame}
                onChange={(e) => setCurrentFrame(Number(e.target.value))}
                className="w-64"
              />
            </div>
          )}
        </div>

        {/* Панель действий - горизонтально */}
        <div className="bg-white rounded-lg shadow p-3 border flex items-center gap-4">
          {/* Экспорт/Импорт */}
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(
                  e.target.value as "json" | "yolo" | "coco" | "voc",
                )
              }
              className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="json">JSON</option>
              <option value="yolo">YOLO</option>
              <option value="coco">COCO</option>
              <option value="voc">VOC</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
            >
              <Download size={14} /> Экспорт
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              <Upload size={14} /> Импорт
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Запуск трекинга */}
          {!isProcessing && processingProgress === 0 && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleStartTracking}
              disabled={!hasAnnotations}
            >
              <Play size={14} /> Запустить Трекинг
            </Button>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Обработка...</span>
              <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-primary w-10 text-right">
                {processingProgress}%
              </span>
            </div>
          )}

          {!isProcessing && processingProgress === 100 && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-600" /> Готово
              </span>
              <Button variant="outline" size="sm" className="gap-2">
                <Save size={14} /> Сохранить
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Download size={14} /> YOLO
              </Button>
            </div>
          )}

          {/* Индикатор формата экспорта */}
          <div className="ml-auto text-xs text-muted-foreground">
            Экспорт:{" "}
            <strong className="text-primary">
              {annotationType === "rect"
                ? "рамки"
                : annotationType === "point"
                  ? "точки"
                  : "все"}
            </strong>
          </div>
        </div>

        {/*
            В реальности здесь нужно извлекать кадр из видео.
            Для демо мы используем статичную картинку-заглушку,
            эмулируя, что это "первый кадр" загруженного видео.
        */}
        <div className="flex-1 min-h-[500px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-200">
          {/* Для демо используем заглушку картинки, в проде тут будет фрейм из видео */}
          <Annotator
            imageUrl="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
            width={800}
            height={500}
            highlightedAnnotationId={highlightedAnnotationId}
          />
        </div>
      </div>

      {/* Диалог подтверждения запуска трекинга */}
      {trackingConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-lg mb-2">Запуск трекинга</h3>
            <p className="text-sm text-gray-600 mb-4">
              Начать трекинг объектов на видео?
              <br />
              <span className="text-xs text-muted-foreground">
                Формат разметки:{" "}
                <strong>
                  {annotationType === "rect"
                    ? "рамки (box)"
                    : annotationType === "point"
                      ? "точки (point)"
                      : "все типы"}
                </strong>
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={confirmStartTracking}
                className="flex-1"
              >
                Запустить
              </Button>
              <Button
                variant="outline"
                onClick={() => setTrackingConfirm(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAnnotation;
