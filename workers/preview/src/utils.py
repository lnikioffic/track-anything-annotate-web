from ml_core.tools.annotations_prompts_types import (
    AnnotationInfo,
    AnnotationItem,
)


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
        if prompt['mode'] not in ['point', 'box', 'both']:
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
