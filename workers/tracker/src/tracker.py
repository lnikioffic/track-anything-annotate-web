import gc

import numpy as np
import psutil
import torch
from ml_core import SamController, SegmentationService
from ml_core.tools.annotations_prompts_types import AnnotationInfo
from ml_core.tools.converter import colored_mask_to_indices, merge_masks
from ml_core.tools.mask_display import mask_map
from ml_core.tools.utils import mask_center
from ml_core.Tracker.xmem2_tracker import TrackerCore
from tqdm import tqdm


class Tracker:
    def __init__(
        self, segmenter_controller: SamController, tracker_core: TrackerCore,
    ):
        self._segmentation = SegmentationService(segmenter_controller)
        self.tracker = tracker_core

    @property
    def sam_controller(self) -> SamController:
        return self._segmentation.sam_controller

    def set_image(self, image: np.ndarray):
        self.sam_controller.set_image(image)

    def reset_image(self):
        self.sam_controller.reset_image()

    def segment_objects(
        self, annotations_info: list[AnnotationInfo],
    ) -> np.ndarray:
        return self._segmentation.segment_objects(annotations_info)

    def sam_ref(self, frame, mask):
        self.sam_controller.reset_image()
        centers = []
        for m in mask_map(mask):
            centers.append(mask_center(m))

        print(centers)
        prompts = []
        for center in centers:
            prompt = {
                'point_coords': np.array([center]),
                'point_labels': np.array([1]),
            }
            prompts.append((prompt, False))

        self.sam_controller.set_image(frame)
        results = self.sam_controller.predict_from_prompts('point', prompts)
        results = [
            result[np.argmax(scores)] for result, scores, logits in results
        ]
        _, unique_mask = merge_masks(results)
        mask_indices, _ = colored_mask_to_indices(unique_mask)
        self.sam_controller.reset_image()
        return mask_indices

    def track_objects(
        self,
        frames: list[np.ndarray],
        template_mask: np.ndarray,
        exhaustive: bool = False,
    ) -> list[np.ndarray]:
        masks: list[np.ndarray] = []

        for i in tqdm(range(len(frames)), desc='Tracking'):
            current_memory_usage = psutil.virtual_memory().percent
            if current_memory_usage > 90:
                break

            is_last_frame = i == len(frames) - 1

            # if i in (0, 5, 10):
            #     if masks:
            #         m = masks[-1].copy()
            #         mask_new = self.sam_ref(frames[i], m)
            #         template_mask = mask_new
            #         exhaustive = True
            if i % 10 == 0:
                if self.tracker.is_cuda:
                    torch.cuda.empty_cache()
                    gc.collect()
                else:
                    gc.collect()
            if i == 0:
                mask = self.tracker.track(
                    frames[i], template_mask, exhaustive, end=is_last_frame,
                )
                masks.append(mask)
            else:
                mask = self.tracker.track(frames[i], end=is_last_frame)
                masks.append(mask)
        return masks

    def reset(self):
        self.reset_image()
        self.tracker.clear_memory()
