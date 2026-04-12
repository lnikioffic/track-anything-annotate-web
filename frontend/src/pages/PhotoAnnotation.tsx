import { useRef, useState } from "react";
import UploadZone from "../components/UploadZone";
import Annotator from "../components/annotation/Annotator";
import { Button } from "../components/ui/Button";
import { useImageAnnotationStore } from "../store/imageAnnotationStore";
import {
  previewService,
  type AnnotationPrompt,
} from "../services/previewService";
import {
  Box,
  Crosshair,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wand2,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";

const PhotoAnnotation = () => {
  const {
    images,
    currentImageIndex,
    annotations,
    selectedLabel,
    labels,
    annotationType,
    setImages,
    addImage,
    setCurrentImageIndex,
    setSelectedLabel,
    setAnnotationType,
    addLabel,
    removeLabel,
    removeAnnotation,
    removeAnnotationsByImage,
    skipDeleteConfirm,
    setSkipDeleteConfirm,
    maskImage,
    setMaskImage,
    getCurrentImageFile,
    getCurrentImageSize,
  } = useImageAnnotationStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<
    string | null
  >(null);
  const [exportFormat, setExportFormat] = useState<
    "json" | "yolo" | "coco" | "voc"
  >("json");
  const [isGeneratingMask, setIsGeneratingMask] = useState(false);
  const [maskError, setMaskError] = useState("");

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

  const handleRemoveAllAnnotations = () => {
    if (skipDeleteConfirm) {
      removeAnnotationsByImage(currentImageIndex);
    } else {
      setDeleteAllConfirm(true);
    }
  };

  const confirmRemoveAllAnnotations = () => {
    removeAnnotationsByImage(currentImageIndex);
    setDeleteAllConfirm(false);
  };

  // Фильтрация аннотаций для текущего изображения
  const imageAnnotations = annotations.filter(
    (a) => a.frameId === currentImageIndex,
  );
  const annotationsByLabel = new Map<string, number>();
  imageAnnotations.forEach((a) => {
    annotationsByLabel.set(a.label, (annotationsByLabel.get(a.label) || 0) + 1);
  });

  const handleUpload = async (file: File) => {
    const url = URL.createObjectURL(file);

    // Получаем размеры изображения
    const size = await new Promise<{ width: number; height: number }>(
      (resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = url;
      },
    );

    if (images.length === 0) {
      setImages([url], [file], [size]);
    } else {
      addImage(url, file, size);
    }
  };

  // Конвертация аннотаций в формат для preview сервиса
  const convertAnnotationsToPrompt = (): AnnotationPrompt[] => {
    const imageAnnotations = annotations.filter(
      (a) => a.frameId === currentImageIndex,
    );

    // Получаем оригинальный размер изображения из store
    const imageSize = getCurrentImageSize();
    const originalWidth = imageSize?.width || 1920;
    const originalHeight = imageSize?.height || 1080;

    // Размер канваса
    const canvasWidth = 800;
    const canvasHeight = 600;

    // Простое масштабирование без letterbox
    // Координаты с канваса масштабируются пропорционально размерам изображения
    const scaleX = originalWidth / canvasWidth;
    const scaleY = originalHeight / canvasHeight;

    return imageAnnotations.map((ann) => {
      if (ann.type === "rect") {
        return {
          class_name: ann.label,
          prompt: {
            mode: "box",
            boxes: [
              [
                Math.round(ann.x * scaleX),
                Math.round(ann.y * scaleY),
                Math.round((ann.x + (ann.width || 0)) * scaleX),
                Math.round((ann.y + (ann.height || 0)) * scaleY),
              ],
            ],
          },
        };
      } else {
        return {
          class_name: ann.label,
          prompt: {
            mode: "point",
            point_coords: [
              [Math.round(ann.x * scaleX), Math.round(ann.y * scaleY)],
            ],
            point_labels: [1],
          },
        };
      }
    });
  };

  // Генерация маски через preview сервис
  const handleGenerateMask = async () => {
    const file = getCurrentImageFile();

    if (!file) {
      setMaskError("Файл изображения не найден");
      return;
    }

    const annotationsPrompt = convertAnnotationsToPrompt();
    if (annotationsPrompt.length === 0) {
      setMaskError("Добавьте хотя бы одну аннотацию");
      return;
    }

    setIsGeneratingMask(true);
    setMaskError("");

    try {
      const response = await previewService.generateMaskPreview(
        file,
        annotationsPrompt,
      );
      setMaskImage(response.imageUrl);
    } catch (err) {
      setMaskError(
        err instanceof Error ? err.message : "Ошибка генерации маски",
      );
    } finally {
      setIsGeneratingMask(false);
    }
  };

  // Очистка маски
  const handleClearMask = () => {
    setMaskImage(null);
  };

  const handleAddMoreImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    files.forEach(handleUpload);
    event.target.value = "";
  };

  if (images.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Разметка фото</h1>
        <p className="text-muted-foreground mb-8">
          Загрузите изображения для разметки. Вы сможете переключаться между
          ними и размечать каждое изображение.
        </p>
        <UploadZone
          label="Загрузить изображения (JPG, PNG)"
          accept={{ "image/*": [] }}
          onUpload={handleUpload}
          multiple
        />
      </div>
    );
  }

  return (
    <div className="flex h-full p-6 gap-6 bg-gray-50">
      {/* Левая панель - Инструменты */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            ТИП РАЗМЕТКИ
          </h4>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-md mb-2">
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
            <p className="text-xs text-muted-foreground mb-4">
              Активен режим:{" "}
              <strong>{annotationType === "rect" ? "рамки" : "точки"}</strong>
            </p>
          )}

          <h3 className="font-semibold text-sm mb-2 text-gray-500">
            КЛАССЫ ({labels.length}/5)
          </h3>

          {/* Форма добавления класса */}
          <div className="flex gap-2 mb-3">
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
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}

          {/* Опция пропуска подтверждения */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
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
            {labels.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Нет добавленных классов
              </p>
            )}
          </div>

          {/* Удаление всех аннотаций на изображении */}
          {imageAnnotations.length > 0 && (
            <>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleRemoveAllAnnotations}
                >
                  Удалить все аннотации ({imageAnnotations.length})
                </Button>
              </div>

              {/* Список аннотаций на изображении */}
              <div className="mt-2">
                <h4 className="font-semibold text-xs text-gray-500 mb-2">
                  АННОТАЦИИ НА ИЗОБРАЖЕНИИ
                </h4>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {imageAnnotations.map((ann) => (
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
                          removeAnnotation(ann.id);
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
            </>
          )}
        </div>
      </div>

      {/* Центральная часть - Канвас */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Верхняя панель - Галерея и информация */}
        <div className="bg-white rounded-lg shadow p-3 border flex items-center gap-4">
          <div className="text-sm font-medium px-4">
            Изображение: {currentImageIndex + 1} / {images.length}
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Навигация по изображениям */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentImageIndex === 0}
              onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
            >
              <ChevronLeft size={14} /> Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentImageIndex === images.length - 1}
              onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
            >
              Вперёд <ChevronRight size={14} />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Дозагрузка изображений */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddMoreImages}
          >
            <Plus size={14} /> Добавить ещё
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="ml-auto" />

          {/* Формат и экспорт */}
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
            <Button variant="secondary" size="sm" className="gap-2">
              <Download size={14} /> Скачать Датасет
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
          <Annotator
            imageUrl={images[currentImageIndex]}
            width={800}
            height={600}
            highlightedAnnotationId={highlightedAnnotationId}
            imageIndex={currentImageIndex}
            maskImageUrl={maskImage}
          />
        </div>

        {/* Панель управления маской */}
        {imageAnnotations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-3 border flex items-center gap-4">
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={handleGenerateMask}
              disabled={isGeneratingMask}
            >
              {isGeneratingMask ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {isGeneratingMask ? "Генерация..." : "Создать превью маски"}
            </Button>

            {maskImage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleClearMask}
                >
                  Скрыть маску
                </Button>
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-600" />
                  Маска сгенерирована
                </span>
              </>
            )}

            {maskError && (
              <span className="text-xs text-destructive">{maskError}</span>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              Превью маски для первого кадра
            </div>
          </div>
        )}
      </div>

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

      {/* Диалог подтверждения удаления всех аннотаций */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
            <h3 className="font-semibold text-lg mb-2">
              Подтверждение удаления
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Удалить все аннотации на изображении ({imageAnnotations.length})?
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

export default PhotoAnnotation;
