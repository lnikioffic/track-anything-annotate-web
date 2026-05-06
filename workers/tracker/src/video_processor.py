from collections.abc import Iterator
from dataclasses import dataclass

import cv2
import numpy as np
import progressbar


@dataclass
class VideoInfo:
    fps: float
    frame_count: int
    width: int
    height: int
    codec: str
    path: str

    @property
    def duration(self) -> float:
        """Длительность видео в секундах."""
        return self.frame_count / self.fps if self.fps > 0 else 0.0

    @property
    def resolution(self) -> tuple[int, int]:
        """Разрешение видео (width, height)."""
        return (self.width, self.height)


class VideoProcessor:
    def __init__(
        self,
        video_path: str,
    ):
        self.video_path = video_path
        self._cap: cv2.VideoCapture | None = None

    def get_video_info(self) -> VideoInfo:
        """
        Получение информации о видео.

        Returns:
            VideoInfo: Информация о видео.
        """
        cap = cv2.VideoCapture(str(self.video_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        codec = self._get_codec(cap)

        cap.release()
        return VideoInfo(
            fps=fps,
            frame_count=frame_count,
            width=width,
            height=height,
            codec=codec,
            path=str(self.video_path),
        )

    def extract_frames(
        self,
        max_frames: int | None = None,
    ) -> Iterator[tuple[int, np.ndarray]]:
        cap = cv2.VideoCapture(str(self.video_path))

        if not cap.isOpened():
            raise OSError(f'Cannot open video: {self.video_path}')

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if max_frames:
            total_frames = min(total_frames, max_frames)

        bar = progressbar.ProgressBar(max_value=total_frames)

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if max_frames and frame_idx >= max_frames:
                break

            yield frame_idx, frame

            frame_idx += 1
            bar.update(frame_idx)

        cap.release()
        bar.finish()

    def extract_all_frames(
        self,
        max_frames: int | None = None,
    ) -> list[np.ndarray]:
        """
        Извлечение всех кадров в список.

        Args:
            max_frames: Максимальное количество кадров.

        Returns:
            list[np.ndarray]: Список кадров.
        """
        return [frame for _, frame in self.extract_frames(max_frames)]

    def _get_codec(self, cap: cv2.VideoCapture) -> str:
        """
        Получение кодека видео.

        Args:
            cap: Объект VideoCapture.

        Returns:
            str: Строка кодека (например, 'H264').
        """
        codec_int = int(cap.get(cv2.CAP_PROP_FOURCC))
        return ''.join(chr((codec_int >> 8 * i) & 0xFF) for i in range(4))
