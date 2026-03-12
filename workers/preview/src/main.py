import json
from typing import Annotated

import cv2
from fastapi import FastAPI, File, Form, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ml_core import (
    Sam2ModelSize,
    SamController,
    SegmentationService,
    Segmenter,
)
from ml_core.tools.annotations_prompts_types import AnnotationItem
from ml_core.Tracker.XMem2.inference.interact.interactive_utils import overlay_davis

from src.utils import get_info_prompt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/process")
def process_media(
    file: Annotated[UploadFile, File()],
    metadata: Annotated[str, Form()],
) -> Response:
    allowed_types = [
        "image/jpeg",
        "image/png",
        "video/mp4",
    ]
    if file.content_type and file.content_type not in allowed_types:
        raise ValueError(f"Неподдерживаемый тип файла: {file.content_type}")

    metadata = json.loads(metadata)
    data = list(map(lambda x: AnnotationItem(**x), metadata))
    class_names, annotations_info = get_info_prompt(data)

    import tempfile

    content = file.file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    video = cv2.VideoCapture(tmp_path)
    ret, frame = video.read()
    video.release()

    segmenter = Segmenter(Sam2ModelSize.Large, "cpu")
    segmenter_controller = SamController(segmenter)
    segmenter_service = SegmentationService(segmenter_controller)
    segmenter_service.sam_controller.set_image(frame)
    mask = segmenter_service.segment_objects(annotations_info)

    overley_mask = overlay_davis(frame, mask)
    # cv2.imwrite("test_mask_result.png", overley_mask)
    _, encoded = cv2.imencode(".jpg", overley_mask)
    print(data[0]["prompt"])
    return Response(content=encoded.tobytes(), media_type="image/jpeg")


# @app.post("/process_json")
# async def process(
#     metadata: list[AnnotationItem],
# ):
#     """Обработка изображения или видео с метаданными."""


#     print(metadata)
