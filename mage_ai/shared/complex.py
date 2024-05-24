import inspect
from typing import Any


def is_model_sklearn(data: Any) -> bool:
    if inspect.isclass(data):
        return False

    try:
        from sklearn.base import BaseEstimator, is_classifier, is_regressor

        return (
            is_classifier(data) or is_regressor(data) or isinstance(data, BaseEstimator)
        )
    except ImportError as err:
        print(f"Error importing sklearn: {err}")
        return False


def is_model_xgboost(data: Any) -> bool:
    """
    Checks if the given data is an instance of an XGBoost model, either a Booster
    or an object from XGBoost's scikit-learn API.
    """
    if inspect.isclass(data):
        return False

    # Check for direct instance of Booster
    if inspect.isclass(data):
        # Checking if it's a class reference rather than an instance
        if "xgboost.core.Booster" == f"{data.__module__}.{data.__qualname__}":
            return True
    else:
        # Check based on instance attributes and methods
        if hasattr(data, "__class__"):
            class_name = f"{data.__class__.__module__}.{data.__class__.__qualname__}"
            if class_name.startswith("xgboost.core.Booster"):
                return True

    # Check for sklearn API models (like XGBClassifier, XGBRegressor)
    # These models have a get_booster() method
    if hasattr(data, "get_booster"):
        return True

    return False
