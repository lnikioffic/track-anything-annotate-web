import json
from contextlib import asynccontextmanager
from typing import Annotated

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from ml_core.tools.annotations_prompts_types import AnnotationItem
from ml_core.Tracker.XMem2.inference.interact.interactive_utils import (
    overlay_davis,
)
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
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health', status_code=status.HTTP_200_OK)
async def health():
    return {'status': 'ok'}


@app.post('/preview')
async def preview(
    file: Annotated[UploadFile, File()],
    json_data: Annotated[str, Form()],
) -> Response:
    allowed_types = ['image/jpeg', 'image/png']
    if file.content_type not in allowed_types:
        return Response(content='Unsupported media type', status_code=415)

    try:
        metadata = json.loads(json_data)
        items: list[AnnotationItem] = [AnnotationItem(**x) for x in metadata]
    except (json.JSONDecodeError, ValidationError) as e:
        return Response(content=f'Invalid JSON: {e}', status_code=400)

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return Response(content='Failed to decode image', status_code=400)
    _, annotations_info = get_info_prompt(items)

    mask = await state.segmenter.process_image(frame, annotations_info)

    # Конвертируем маску в правильный тип для overlay_davis
    mask = mask.astype(np.int32)

    overlay_mask = overlay_davis(frame, mask)
    # cv2.imwrite("test_mask_result.png", overley_mask)
    success, encoded = cv2.imencode('.jpg', overlay_mask)

    if not success:
        return Response(content='Failed to encode result', status_code=500)
    print(items[0]['prompt'])
    return Response(content=encoded.tobytes(), media_type='image/jpeg')
