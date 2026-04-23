import numpy as np
import torch
from torchvision import transforms

from ml_core.config import DEVICE, ML_CORE_ROOT, XMEM_CONFIG
from ml_core.Tracker.XMem2.inference.data.mask_mapper import MaskMapper
from ml_core.Tracker.XMem2.inference.inference_core import InferenceCore
from ml_core.Tracker.XMem2.model.network import XMem
from ml_core.Tracker.XMem2.util.range_transform import im_normalization


class TrackerCore:
    name_version = 'XMem2'

    def __init__(self, device: str = DEVICE):
        self.device = torch.device(device)
        self.is_cuda = self.device.type == 'cuda'

        self.network = (
            XMem(
                XMEM_CONFIG,
                ML_CORE_ROOT.parent.parent / 'checkpoints/XMem.pth',
                map_location=self.device.type,
            )
            .eval()
            .to(self.device)
        )
        self.processor = InferenceCore(self.network, XMEM_CONFIG)

        self.im_transform = transforms.Compose([
            transforms.ToTensor(),
            im_normalization,
        ])
        self.mapper = MaskMapper()
        self.clear_memory()

    @torch.inference_mode()
    def track(
        self,
        frame: np.ndarray,
        mask_segment: np.ndarray | None = None,
        exhaustive: bool = False,
        end: bool = False,
    ):

        mask_tensor = None
        labels = None

        if mask_segment is not None:
            mask, labels = self.mapper.convert_mask(mask_segment, exhaustive)
            mask_tensor = torch.as_tensor(mask, device=self.device).float()
            self.processor.set_all_labels(list(self.mapper.remappings.values()))

        frame_tensor = self.im_transform(frame).to(
            self.device, non_blocking=self.is_cuda
        )

        if self.is_cuda:
            with torch.autocast(
                device_type='cuda',
                dtype=torch.float16,
                enabled=True,
            ):
                probs = self.processor.step(
                    frame_tensor,
                    mask_tensor,
                    labels,
                    end=end,
                )
                out_mask_acc = torch.argmax(probs, dim=0)
        else:
            probs = self.processor.step(
                frame_tensor,
                mask_tensor,
                labels,
                end=end,
            )
            out_mask_acc = torch.argmax(probs, dim=0)

        out_mask = out_mask_acc.to(torch.uint8).cpu().numpy()

        if not self.mapper.remappings:
            return np.zeros_like(out_mask)

        lut = np.zeros(max(self.mapper.remappings.values()) + 1, dtype=np.uint8)
        for k, v in self.mapper.remappings.items():
            lut[v] = k

        return lut[out_mask]

    @torch.inference_mode()
    def clear_memory(self):
        self.processor.clear_memory(keep_permanent=True)
        self.mapper.clear_labels()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
