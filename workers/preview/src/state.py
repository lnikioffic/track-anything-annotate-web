import asyncio

import numpy as np
from ml_core import (
    Sam2ModelSize,
    SamController,
    SegmentationService,
    Segmenter,
)


class SegmentState:
    def __init__(self) -> None:
        self._segmenter = Segmenter(Sam2ModelSize.Large, 'cpu')
        self.segmenter_controller = SamController(self._segmenter)
        self.segmenter_service = SegmentationService(self.segmenter_controller)

        self.lock = asyncio.Lock()

    async def process_image(self, frame: np.ndarray, annotation: list):
        async with self.lock:
            self.segmenter_controller.set_image(frame)
            mask = self.segmenter_service.segment_objects(annotation)
            self.segmenter_controller.reset_image()
            return mask


class AppState:
    def __init__(self) -> None:
        self.segmenter = SegmentState()
