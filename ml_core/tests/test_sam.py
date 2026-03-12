"""Интеграционные тесты для SamController и SegmentationService.

Примечание: Не используйте cv2.imshow() и другие GUI-операции в тестах.
Тесты должны работать автоматически без участия человека.
Для отладки можно сохранять результаты в файл через cv2.imwrite().
"""

import cv2
import numpy as np
import pytest

from ml_core.Segmenter.sam_controller import SamController, SegmentationService
from ml_core.Segmenter.segmenter import Sam2ModelSize, Segmenter
from ml_core.tools.annotations_prompts_types import AnnotationInfo, PointPrompt
from ml_core.tools.converter import colored_mask_to_indices, merge_masks
from ml_core.tools.mask_display import visualize_unique_mask
from ml_core.Tracker.XMem2.inference.interact.interactive_utils import overlay_davis

"""
Добавить проверку на время выполнения на cpu
"""


@pytest.fixture(scope="module")
def segmenter() -> Segmenter:
    """Создаёт сегментер с моделью размера Large."""
    return Segmenter(Sam2ModelSize.Large)


@pytest.fixture(scope="module")
def controller(segmenter: Segmenter) -> SamController:
    """Создаёт SamController с сегментером."""
    return SamController(segmenter)


@pytest.fixture(scope="module")
def controller_with_image(
    segmenter: Segmenter, test_image: np.ndarray
) -> SamController:
    """Создаёт SamController с сегментером и загруженным изображением."""
    controller = SamController(segmenter)
    controller.set_image(test_image)
    return controller


@pytest.fixture(scope="module")
def test_image() -> np.ndarray:
    """Загружает тестовое изображение из video-test/truck.jpg."""
    video = cv2.VideoCapture("assets/video.mp4")
    ret, frame = video.read()
    video.release()
    if not ret:
        raise FileNotFoundError(
            "Не удалось загрузить тестовое изображение assets/video.jpg"
        )
    return frame


class TestSamControllerPointPrompts:
    """Тесты для режима сегментации по точкам."""

    def test_single_point_prompt(
        self, controller_with_image: SamController, test_image: np.ndarray
    ):
        """Тест сегментации с одной точкой."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230]],
            "point_labels": [1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        assert len(results) == 1
        masks, scores, logits = results[0]
        assert masks.shape[0] > 0  # Есть хотя бы одна маска
        assert scores.shape[0] > 0
        assert logits.shape[0] > 0
        # Проверка формы маски (должна соответствовать размеру изображения)
        assert masks.shape[1:] == test_image.shape[:2]
        # Проверка диапазона вероятностей
        assert all(0 <= scores) and all(scores <= 1)

    def test_multiple_point_prompts(
        self, controller_with_image: SamController, test_image: np.ndarray
    ):
        """Тест сегментации с несколькими точками."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230], [45, 321], [226, 360], [194, 313]],
            "point_labels": [1, 1, 1, 1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        assert len(results) == 4
        for masks, scores, logits in results:
            assert masks.shape[0] > 0
            assert scores.shape[0] > 0
            assert logits.shape[0] > 0
            # Проверка формы маски
            assert masks.shape[1:] == test_image.shape[:2]
            # Проверка диапазона вероятностей
            assert all(0 <= scores) and all(scores <= 1)

    def test_merge_masks_from_point_prompts(self, controller_with_image: SamController):
        """Тест объединения масок из промптов по точкам."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230], [45, 321], [226, 360], [194, 313]],
            "point_labels": [1, 1, 1, 1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        masks_list = [result[np.argmax(scores)] for result, scores, logits in results]
        mask, unique_mask = merge_masks(masks_list)

        assert mask is not None
        assert unique_mask is not None

    def test_mask_indices_conversion(self, controller_with_image: SamController):
        """Тест конвертации маски в индексы."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230], [45, 321], [226, 360], [194, 313]],
            "point_labels": [1, 1, 1, 1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        masks_list = [result[np.argmax(scores)] for result, scores, logits in results]
        _, unique_mask = merge_masks(masks_list)
        mask_indices, colors = colored_mask_to_indices(unique_mask)

        assert mask_indices is not None
        assert colors is not None
        assert len(colors) > 0

    def test_visualize_mask(self, controller_with_image: SamController):
        """Тест визуализации маски."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230], [45, 321], [226, 360], [194, 313]],
            "point_labels": [1, 1, 1, 1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        masks_list = [result[np.argmax(scores)] for result, scores, logits in results]
        _, unique_mask = merge_masks(masks_list)
        mask_indices, _ = colored_mask_to_indices(unique_mask)
        mask = visualize_unique_mask(mask_indices)

        assert mask is not None
        assert mask.ndim == 3  # Цветное изображение
        assert mask.shape[2] == 3  # 3 канала (RGB)

        # Сохранение для визуальной проверки (опционально)
        cv2.imwrite("assets/test_mask_result.png", mask)

    def test_overlay_davis(
        self, controller_with_image: SamController, test_image: np.ndarray
    ):
        """Тест наложения маски на изображение."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230], [45, 321], [226, 360], [194, 313]],
            "point_labels": [1, 1, 1, 1],
        }
        mode, processed_prompts = controller_with_image.parse_prompts(prompts)
        results = controller_with_image.predict_from_prompts(mode, processed_prompts)

        masks_list = [result[np.argmax(scores)] for result, scores, logits in results]
        _, unique_mask = merge_masks(masks_list)
        mask_indices, _ = colored_mask_to_indices(unique_mask)
        overlay = overlay_davis(test_image, mask_indices)

        assert overlay is not None
        assert overlay.shape == test_image.shape
        assert overlay.dtype == np.uint8

        # Сохранение для визуальной проверки (опционально)
        cv2.imwrite("assets/test_overlay_result.png", overlay)

    def test_parse_prompts_without_image(self, controller: SamController):
        """Тест parse_prompts без загруженного изображения."""
        prompts: PointPrompt = {
            "mode": "point",
            "point_coords": [[531, 230]],
            "point_labels": [1],
        }
        with pytest.raises(RuntimeError, match="Image not loaded"):
            controller.parse_prompts(prompts)


class TestSegmentationService:
    """Тесты для SegmentationService."""

    def test_segment_objects(
        self, controller_with_image: SamController, test_image: np.ndarray
    ):
        """Тест сегментации объектов через сервис."""
        service = SegmentationService(controller_with_image)

        annotations_info: list[AnnotationInfo] = [
            AnnotationInfo(
                class_name="cat",
                prompt={
                    "mode": "point",
                    "point_coords": [[531, 230]],
                    "point_labels": [1],
                },
            ),
            AnnotationInfo(
                class_name="cat",
                prompt={
                    "mode": "point",
                    "point_coords": [[45, 321]],
                    "point_labels": [1],
                },
            ),
        ]

        mask_indices = service.segment_objects(annotations_info)

        assert mask_indices is not None
        assert isinstance(mask_indices, np.ndarray)
        assert mask_indices.ndim == 2  # 2D маска с индексами

        overlay = overlay_davis(test_image, mask_indices)
        cv2.imwrite("assets/test_mask_indices_result.png", overlay)
