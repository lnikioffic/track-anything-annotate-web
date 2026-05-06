import numpy as np

from src.dataset_export.factory import get_type_save_annotation


def create_dataset(
    images: list[np.ndarray],
    masks: list[np.ndarray],
    class_names: list[str],
    id_map: dict,
    task_id: str,
    type_save: str = 'yolo',
):
    if len(masks) != len(images):
        raise ValueError(
            f'Len masks {len(masks)} does not match Len images {len(images)}',
        )

    send_images = []
    send_masks = []
    for i in range(len(masks)):
        if i % 4 == 0:
            send_images.append(images[i])
            send_masks.append(masks[i])

    saver = get_type_save_annotation(
        send_images,
        send_masks,
        class_names,
        task_id,
        type_save,
    )
    saver.save(id_map)
    archive_path = saver.archive()
    print(f'Saved archive {archive_path}')
    return archive_path
