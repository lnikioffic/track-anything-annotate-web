import numpy as np

from src.dataset_export.base_saver import DatasetSaverProtocol
from src.dataset_export.coco import CocoDatasetSaver
from src.dataset_export.voc import VocDatasetSaver
from src.dataset_export.yolo import YoloDatasetSaver


def get_type_save_annotation(
    images: list[np.ndarray],
    masks: list[np.ndarray],
    class_names: list[str],
    task_id: str,
    type_save: str = 'yolo',
) -> DatasetSaverProtocol:
    """Selector Factory."""
    types_saves: dict[str, type[DatasetSaverProtocol]] = {
        'yolo': YoloDatasetSaver,
        'coco': CocoDatasetSaver,
        'voc': VocDatasetSaver,
    }
    saver_class = types_saves.get(type_save.lower())
    if saver_class is None:
        raise ValueError(f'Unknown dataset type: {type_save}')

    return saver_class(images, masks, class_names, task_id)
