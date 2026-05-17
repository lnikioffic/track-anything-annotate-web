import React, { useState, useRef } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Image as KonvaImage,
  Text,
} from "react-konva";
import { useStore, ANNOTATION_COLORS } from "../../store/annotationStore";
import { generateId } from "../../lib/utils";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage as StageType } from "konva/lib/Stage";

interface AnnotatorProps {
  imageUrl: string;
  width: number;
  height: number;
  scale?: number;
  highlightedAnnotationId: string | null;
  maskImageUrl?: string | null;
}

const Annotator: React.FC<AnnotatorProps> = ({
  imageUrl,
  width,
  height,
  scale = 1,
  highlightedAnnotationId,
  maskImageUrl,
}) => {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const [maskImage, setMaskImage] = useState<HTMLImageElement | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (!imageUrl) { setImage(undefined); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setImage(img); };
    img.onerror = () => { if (!cancelled) setImage(undefined); };
    img.src = imageUrl;
    // data URL может быть уже complete к моменту назначения onload
    if (img.complete && img.naturalWidth > 0 && !cancelled) setImage(img);
    return () => { cancelled = true; };
  }, [imageUrl]);

  React.useEffect(() => {
    if (!maskImageUrl) { setMaskImage(undefined); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setMaskImage(img); };
    img.onerror = () => { if (!cancelled) setMaskImage(undefined); };
    img.src = maskImageUrl;
    if (img.complete && img.naturalWidth > 0 && !cancelled) setMaskImage(img);
    return () => { cancelled = true; };
  }, [maskImageUrl]);

  const {
    annotationType: tool,
    selectedLabel,
    addAnnotation,
    updateAnnotation,
    annotations,
    labels,
    currentFrame,
  } = useStore();

  const currentColor =
    ANNOTATION_COLORS[labels.indexOf(selectedLabel) % ANNOTATION_COLORS.length];

  const [newAnnotation, setNewAnnotation] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const isDrawing = useRef(false);
  const stageRef = useRef<StageType>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  const MAX_ANNOTATIONS = 10;

  const visibleAnnotations = annotations.filter(
    (a) => a.frameId === currentFrame,
  );

  // getPointerPosition() returns CSS pixels on the stage DOM element.
  // Divide by scale to convert to logical canvas coordinates.
  const getLogicalPos = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale, y: pos.y / scale };
  };

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!tool) return;
    if (!selectedLabel) return;
    if (visibleAnnotations.length >= MAX_ANNOTATIONS) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 3000);
      return;
    }

    const pos = getLogicalPos(e);
    if (!pos) return;

    isDrawing.current = true;

    if (tool === "rect") {
      setNewAnnotation({ x: Math.round(pos.x), y: Math.round(pos.y), w: 0, h: 0 });
    } else if (tool === "point") {
      addAnnotation({
        id: generateId(),
        type: "point",
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        label: selectedLabel,
        frameId: currentFrame,
        color: "#fff",
      });
      isDrawing.current = false;
    }
  };

  const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing.current || tool !== "rect" || !newAnnotation) return;
    const pos = getLogicalPos(e);
    if (!pos) return;
    setNewAnnotation((prev) => ({
      ...prev!,
      w: Math.round(pos.x - prev!.x),
      h: Math.round(pos.y - prev!.y),
    }));
  };

  const handlePointerUp = () => {
    if (isDrawing.current && tool === "rect" && newAnnotation) {
      if (Math.abs(newAnnotation.w) > 5 && Math.abs(newAnnotation.h) > 5 && selectedLabel) {
        addAnnotation({
          id: generateId(),
          type: "rect",
          x: Math.round(newAnnotation.x),
          y: Math.round(newAnnotation.y),
          width: Math.round(newAnnotation.w),
          height: Math.round(newAnnotation.h),
          label: selectedLabel,
          frameId: currentFrame,
          color: "#fff",
        });
      }
    }
    setNewAnnotation(null);
    isDrawing.current = false;
  };

  return (
    <div className="relative bg-gray-100 rounded-lg overflow-hidden border shadow-inner">
      <Stage
        width={width * scale}
        height={height * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => handlePointerDown(e as KonvaEventObject<MouseEvent | TouchEvent>)}
        onMouseMove={(e) => handlePointerMove(e as KonvaEventObject<MouseEvent | TouchEvent>)}
        onMouseUp={handlePointerUp}
        onTouchStart={(e) => handlePointerDown(e as KonvaEventObject<MouseEvent | TouchEvent>)}
        onTouchMove={(e) => handlePointerMove(e as KonvaEventObject<MouseEvent | TouchEvent>)}
        onTouchEnd={handlePointerUp}
        ref={stageRef}
      >
        <Layer>
          <KonvaImage
            image={maskImageUrl && maskImage ? maskImage : image}
            width={width}
            height={height}
          />

          {visibleAnnotations.map((ann) => {
            const isHighlighted = highlightedAnnotationId === ann.id;
            if (ann.type === "rect") {
              return (
                <React.Fragment key={ann.id}>
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
                    draggable={!tool}
                    onDragEnd={(e) =>
                      updateAnnotation(ann.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      })
                    }
                  />
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
                    draggable={!tool}
                    onDragEnd={(e) =>
                      updateAnnotation(ann.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      })
                    }
                  />
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

      {showLimitWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <span className="font-medium">
            Максимум {MAX_ANNOTATIONS} аннотаций на кадр
          </span>
        </div>
      )}
    </div>
  );
};

export default Annotator;
