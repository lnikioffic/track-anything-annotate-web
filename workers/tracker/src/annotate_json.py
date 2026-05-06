from ml_core import Sam2ModelSize, SamController, Segmenter
from ml_core.tools.annotations_prompts_types import (
    AnnotationInfo,
    AnnotationItem,
)
from ml_core.Tracker.xmem2_tracker import TrackerCore

from src.dataset_export.pipeline import create_dataset
from src.tracker import Tracker
from src.video_processor import VideoProcessor


def extract_frames(video_path: str, frames_to_propagate: int | None = None):
    processor = VideoProcessor(video_path)
    video_info = processor.get_video_info()
    frames = processor.extract_all_frames(frames_to_propagate)
    return frames, video_info


def get_info_prompt(
    annotation_item: list[AnnotationItem],
) -> tuple[list[str], list[AnnotationInfo]]:
    class_names: list[str] = []
    annotations_info: list[AnnotationInfo] = []
    class_names_dict: dict[str, int] = {}
    i = 0
    for item in annotation_item:
        class_name = item['class_name']
        if class_name not in class_names_dict:
            class_names_dict[class_name] = i
            class_names.append(class_name)
            i += 1

        prompt = item['prompt']
        if prompt['mode'] not in {'point', 'box', 'both'}:
            raise ValueError(f'Invalid mode: {prompt["mode"]}')

        if prompt['mode'] == 'point':
            labels = prompt['point_coords']
        elif prompt['mode'] == 'box':
            labels = prompt['boxes']
        else:
            labels = prompt['boxes']

        annotation_info = AnnotationInfo(
            class_name=class_name,
            prompt=prompt,
            count_objects=len(labels),
            order=class_names_dict[class_name],
        )
        annotations_info.append(annotation_info)

    return class_names, annotations_info


def tracking(
    video_path: str,
    type_save: str,
    data: list[AnnotationItem],
    task_id: str,
):
    images, _ = extract_frames(video_path)
    class_names, annotations_info = get_info_prompt(data)

    segmenter = Segmenter(Sam2ModelSize.Large)
    segmenter_controller = SamController(segmenter)
    tracker_core = TrackerCore()
    tracker = Tracker(segmenter_controller, tracker_core)

    tracker.set_image(images[0])
    mask = tracker.segment_objects(annotations_info)

    masks = tracker.track_objects(images, mask)
    tracker.reset()

    i = 0
    id_map = {}
    for ann in annotations_info:
        key = list(ann.prompt.keys())[1]
        for _ in ann.prompt[f'{key}']:
            mask_id = i + 1
            i += 1
            id_map[mask_id] = {
                'class': ann.class_name,
                'order': ann.order,
                'mask_slice_index': i,
            }

    return create_dataset(
        images,
        masks,
        class_names,
        id_map,
        task_id,
        type_save,
    )
