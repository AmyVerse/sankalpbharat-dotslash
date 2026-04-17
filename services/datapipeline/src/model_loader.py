import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib


def _ensure_sklearn_pickle_compatibility() -> None:
    try:
        from sklearn.compose import _column_transformer
    except Exception:
        return

    if hasattr(_column_transformer, "_RemainderColsList"):
        return

    class _RemainderColsList(list):
        pass

    setattr(_column_transformer, "_RemainderColsList", _RemainderColsList)


class ModelRegistry:
    def __init__(self, model_paths: Dict[str, Path]):
        self._model_paths = model_paths
        self._models: Dict[str, Any] = {}
        self._errors: Dict[str, str] = {}

    def load_all(self) -> None:
        for name, path in self._model_paths.items():
            self._load_single(name, path)

    def _load_single(self, name: str, path: Path) -> None:
        if not path.exists():
            self._errors[name] = f"Model file not found: {path}"
            logging.warning(self._errors[name])
            return

        try:
            _ensure_sklearn_pickle_compatibility()
            self._models[name] = joblib.load(path)
            self._errors.pop(name, None)
            logging.info("Loaded model '%s' from %s", name, path)
        except Exception as exc:
            self._errors[name] = f"Failed to load model '{name}': {exc}"
            logging.exception("Error loading model '%s'", name)

    def get(self, name: str) -> Optional[Any]:
        return self._models.get(name)

    def get_error(self, name: str) -> Optional[str]:
        return self._errors.get(name)

    def loaded_models(self) -> List[str]:
        return sorted(self._models.keys())

    def missing_or_failed_models(self) -> Dict[str, str]:
        return dict(self._errors)

    def models_loaded(self) -> bool:
        return len(self._models) > 0
