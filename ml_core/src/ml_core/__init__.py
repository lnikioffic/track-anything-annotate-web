# Segmenter
# Tracker
# from .src.Tracker.xmem2_tracker import TrackerCore
#

# from hydra import initialize_config_module
# from hydra.core.global_hydra import GlobalHydra

# if not GlobalHydra.instance().is_initialized():
#     initialize_config_module("ml_core", version_base="1.2")

from .Segmenter.sam_controller import SamController, SegmentationService
from .Segmenter.segmenter import Sam2ModelSize, Segmenter

# Tools
from .tools.annotations_prompts_types import (
    AnnotationInfo,
    AnnotationItem,
    BothPrompt,
    BoxPrompt,
    PointPrompt,
)
from .tools.contour_detector import (
    draw_annotations,
    get_filtered_bboxes,
    getting_coordinates,
    threshold,
)
from .tools.converter import colored_mask_to_indices, merge_masks
from .tools.mask_display import mask_map, visualize_unique_mask, visualize_wb_mask
from .tools.overlay_image import painter_borders

__all__ = [
    # Segmenter
    "Segmenter",
    "Sam2ModelSize",
    "SamController",
    "SegmentationService",
    # Tracker
    # "TrackerCore",
    # Types
    "AnnotationInfo",
    "AnnotationItem",
    "PointPrompt",
    "BoxPrompt",
    "BothPrompt",
    # Utils
    "merge_masks",
    "colored_mask_to_indices",
    "visualize_unique_mask",
    "visualize_wb_mask",
    "mask_map",
    "threshold",
    "draw_annotations",
    "get_filtered_bboxes",
    "getting_coordinates",
    "painter_borders",
]
