import base64
import io
from typing import Any, Optional

from PIL import Image

from mage_ai.shared.environments import is_debug


# Function to check if the booster is trained
def is_booster_trained(booster: Any, raise_exception: bool = True) -> bool:
    # Check if the booster has been trained by checking for the existence of an attribute
    # like 'feature_names'; this attribute is set upon training.
    # If the model is not trained, accessing this attribute should raise an AttributeError.
    try:
        import xgboost as xgb

        # If feature_names exists, it means the model has been trained.
        return booster.num_boosted_rounds() >= 1
    except xgb.core.XGBoostError as err:
        message = f'XGBoost model is not trained. {err}'

        if raise_exception:
            raise Exception(message)

        print(message)

        # If the model is not trained, an AttributeError is raised.
        return False


def load_model(path: str, raise_exception: bool = True) -> Optional[Any]:
    try:
        import xgboost as xgb

        model = xgb.Booster()
        model.load_model(path)

        return model
    except Exception as err:
        if raise_exception or is_debug():
            raise err
        print(f'[ERROR] XGBoost.load_model: {err}')

    return None


def save_model(booster: Any, path: str, raise_exception: bool = True) -> bool:
    if is_booster_trained(booster, raise_exception=raise_exception):
        # Save the booster model to the specified path
        booster.save_model(path)
        return True
    return False


def create_chart(model: Any) -> str:
    import xgboost as xgb

    # Generate a graph of the first tree
    # Adjust num_trees to select different trees
    graph = xgb.to_graphviz(model, num_trees=0, rankdir='TB', format='png')

    # Save the graph to a temporary PNG file (or use BytesIO directly with some adjustments)
    png_bytes = graph.pipe(format='png')

    # Convert PNG bytes to an PIL Image object
    image = Image.open(io.BytesIO(png_bytes))

    # Save or Display your image directly if needed
    # image.show() # Uncomment to display the image directly

    # Convert the PIL Image to a base64 string
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return img_str
