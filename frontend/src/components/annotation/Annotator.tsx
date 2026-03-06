import React, { useState, useRef } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Image as KonvaImage,
  Text,
} from "react-konva";
import useImage from "use-image";
import { useStore } from "../../store/annotationStore";
import { useImageAnnotationStore } from "../../store/imageAnnotationStore";
import { generateId } from "../../lib/utils";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage as StageType } from "konva/lib/Stage";

const colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

interface AnnotatorProps {
  imageUrl: string;
  width: number;
  height: number;
  highlightedAnnotationId: string | null;
  imageIndex?: number; // для фото режима
}

const Annotator: React.FC<AnnotatorProps> = ({
  imageUrl,
  width,
  height,
  highlightedAnnotationId,
  imageIndex,
}) => {
  const [image] = useImage(imageUrl);

  // Определяем какой store использовать
  const isImageMode = imageIndex !== undefined;
  const videoStore = useStore();
  const imageStore = useImageAnnotationStore();

  const store = isImageMode ? imageStore : videoStore;
  const {
    tool,
    selectedLabel,
    addAnnotation,
    updateAnnotation,
    annotations,
    labels,
  } = store;

  // Вычисляем цвет для текущего label
  const currentColor = colors[labels.indexOf(selectedLabel) % colors.length];

  const [newAnnotation, setNewAnnotation] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const isDrawing = useRef(false);
  const stageRef = useRef<StageType>(null);
  const [, selectAnnotation] = useState<string | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  const MAX_ANNOTATIONS = 10;

  // Фильтруем аннотации для текущего изображения/кадра
  const currentId = isImageMode ? imageIndex : videoStore.currentFrame;
  const visibleAnnotations = annotations.filter((a) => a.frameId === currentId);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (tool === "select") {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) selectAnnotation(null);
      return;
    }

    // Блокируем добавление без выбранного класса
    if (!selectedLabel) {
      console.warn("Нельзя добавить аннотацию без выбранного класса");
      return;
    }

    // Блокируем добавление при достижении лимита
    if (visibleAnnotations.length >= MAX_ANNOTATIONS) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 3000);
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    isDrawing.current = true;

    if (tool === "rect") {
      setNewAnnotation({
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        w: 0,
        h: 0,
      });
    } else if (tool === "point") {
      addAnnotation({
        id: generateId(),
        type: "point",
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        label: selectedLabel,
        frameId: currentId,
        color: "#fff", // цвет переопределится в сторе
      });
      isDrawing.current = false;
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current || tool !== "rect" || !newAnnotation) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    setNewAnnotation((prev) => ({
      ...prev!,
      w: Math.round(point.x - prev!.x),
      h: Math.round(point.y - prev!.y),
    }));
  };

  const handleMouseUp = () => {
    if (isDrawing.current && tool === "rect" && newAnnotation) {
      // Игнорируем слишком маленькие боксы
      if (Math.abs(newAnnotation.w) > 5 && Math.abs(newAnnotation.h) > 5) {
        // Блокируем добавление без выбранного класса
        if (selectedLabel) {
          addAnnotation({
            id: generateId(),
            type: "rect",
            x: Math.round(newAnnotation.x),
            y: Math.round(newAnnotation.y),
            width: Math.round(newAnnotation.w),
            height: Math.round(newAnnotation.h),
            label: selectedLabel,
            frameId: currentId,
            color: "#fff",
          });
        }
      }
    }
    setNewAnnotation(null);
    isDrawing.current = false;
  };

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden border shadow-inner">
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          <KonvaImage image={image} width={width} height={height} />

          {visibleAnnotations.map((ann) => {
            const isHighlighted = highlightedAnnotationId === ann.id;
            if (ann.type === "rect") {
              return (
                <React.Fragment key={ann.id}>
                  {/* Подсветка при наведении */}
                  {isHighlighted && (
                    <Rect
                      x={ann.x - 3}
                      y={ann.y - 3}
                      width={(ann.width || 0) + 6}
                      height={(ann.height || 0) + 6}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dash={[5, 5]}
                      listening={false}
                    />
                  )}
                  <Rect
                    x={ann.x}
                    y={ann.y}
                    width={ann.width}
                    height={ann.height}
                    stroke={ann.color}
                    strokeWidth={isHighlighted ? 4 : 2}
                    draggable={tool === "select"}
                    onDragEnd={(e) => {
                      updateAnnotation(ann.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      });
                    }}
                  />
                  {/* Метка класса для рамки */}
                  <Rect
                    x={ann.x}
                    y={ann.y - 20}
                    width={ann.label.length * 8 + 10}
                    height={20}
                    fill={ann.color}
                  />
                  <Text
                    text={ann.label}
                    x={ann.x + 5}
                    y={ann.y - 16}
                    fill="white"
                    fontSize={12}
                  />
                </React.Fragment>
              );
            } else {
              return (
                <React.Fragment key={ann.id}>
                  {/* Подсветка при наведении */}
                  {isHighlighted && (
                    <Circle
                      x={ann.x}
                      y={ann.y}
                      radius={15}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dash={[5, 5]}
                      listening={false}
                    />
                  )}
                  <Circle
                    x={ann.x}
                    y={ann.y}
                    radius={5}
                    fill={ann.color}
                    draggable={tool === "select"}
                    onClick={() => selectAnnotation(ann.id)}
                    onDragEnd={(e) => {
                      updateAnnotation(ann.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      });
                    }}
                  />
                  {/* Метка класса для точки */}
                  <Text
                    text={ann.label}
                    x={ann.x + 10}
                    y={ann.y - 10}
                    fill={ann.color}
                    fontSize={12}
                    fontStyle="bold"
                  />
                </React.Fragment>
              );
            }
          })}

          {newAnnotation && (
            <Rect
              x={newAnnotation.x}
              y={newAnnotation.y}
              width={newAnnotation.w}
              height={newAnnotation.h}
              stroke={currentColor}
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>

      {/* Уведомление о достижении лимита */}
      {showLimitWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">
            Максимум {MAX_ANNOTATIONS} аннотаций на кадр
          </span>
        </div>
      )}
    </div>
  );
};

export default Annotator;
