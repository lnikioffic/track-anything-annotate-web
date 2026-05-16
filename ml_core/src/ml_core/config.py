# config.py
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import torch

ML_CORE_ROOT = Path(__file__).resolve().parent


def get_device() -> str:
    """Возвращает доступное устройство."""
    if torch.cuda.is_available():
        print('Using GPU')
        return 'cuda'
    print('CUDA not available. Using CPU.')
    return 'cpu'


DEVICE = get_device()


@dataclass
class XMemConfig:
    """Конфигурация XMem."""

    top_k: int = 30
    mem_every: int = 10
    deep_update_every: int = -1
    enable_long_term: bool = True
    enable_long_term_count_usage: bool = True
    num_prototypes: int = 128
    min_mid_term_frames: int = 5
    max_mid_term_frames: int = 10
    max_long_term_elements: int = 5000
    size: int = 480
    device: str = DEVICE

    def to_dict(self) -> dict[str, Any]:
        """Конвертация в словарь."""
        return {
            'top_k': self.top_k,
            'mem_every': self.mem_every,
            'deep_update_every': self.deep_update_every,
            'enable_long_term': self.enable_long_term,
            'enable_long_term_count_usage': self.enable_long_term_count_usage,
            'num_prototypes': self.num_prototypes,
            'min_mid_term_frames': self.min_mid_term_frames,
            'max_mid_term_frames': self.max_mid_term_frames,
            'max_long_term_elements': self.max_long_term_elements,
            'size': self.size,
            'device': self.device,
        }


@dataclass
class Config:
    """Глобальная конфигурация."""

    DEVICE: str = DEVICE
    XMEM_CONFIG: XMemConfig = field(default_factory=XMemConfig)


config = Config()

XMEM_CONFIG = config.XMEM_CONFIG.to_dict()
