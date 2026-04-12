import json
from contextlib import asynccontextmanager
from typing import Annotated

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ml_core.tools.annotations_prompts_types import AnnotationItem
from ml_core.Tracker.XMem2.inference.interact.interactive_utils import overlay_davis
from pydantic import ValidationError

from src.state import AppState
from src.utils import get_info_prompt

state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    state.segmenter.segmenter_controller.reset_image()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/preview")
async def preview(
    file: Annotated[UploadFile, File()],
    json_data: Annotated[str, Form()],
) -> Response:
    print(f"Received file: {file.filename}, content_type: {file.content_type}")
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if file.content_type not in allowed_types:
        print(f"Unsupported media type: {file.content_type}")
        return Response(
            content=f"Unsupported media type: {file.content_type}", status_code=415
        )

    try:
        metadata = json.loads(json_data)
        data = list(map(lambda x: AnnotationItem(**x), metadata))
    except (json.JSONDecodeError, ValidationError) as e:
        return Response(content=f"Invalid JSON: {str(e)}", status_code=400)

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Если не получилось декодировать как изображение — пробуем как видео
    if frame is None:
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        video = cv2.VideoCapture(tmp_path)
        ret, frame = video.read()
        video.release()
        if not ret or frame is None:
            return Response(content="Failed to decode image or video", status_code=400)

    class_names, annotations_info = get_info_prompt(data)

    mask = await state.segmenter.process_image(frame, annotations_info)

    # Убедимся что маска правильного типа для overlay_davis
    mask = mask.astype(np.int32)

    overlay_mask = overlay_davis(frame, mask)
    # cv2.imwrite("test_mask_result.png", overley_mask)
    success, encoded = cv2.imencode(".jpg", overlay_mask)

    if not success:
        return Response(content="Failed to encode result", status_code=500)
    print(data[0]["prompt"])
    return Response(content=encoded.tobytes(), media_type="image/jpeg")
