import sys
from pathlib import Path

# Добавляем src в sys.path для импортов
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))
