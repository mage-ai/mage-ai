import base64
import io
import json
import os
from typing import Any, Optional

from mage_ai.data_preparation.models.variables.constants import (
    CONFIG_JSON_FILE,
    MEDIA_IMAGE_VISUALIZATION_FILE,
    UBJSON_MODEL_FILENAME,
)
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


def load_model(
    model_dir: str,
    model_filename: str = UBJSON_MODEL_FILENAME,
    config_filename: str = CONFIG_JSON_FILE,
    raise_exception: bool = True,
) -> Optional[Any]:
    try:
        import xgboost as xgb

        model_path = os.path.join(model_dir, model_filename)
        model = xgb.Booster()
        model.load_model(model_path)

        config_path = os.path.join(model_dir, config_filename)
        with open(config_path, 'r') as file:
            model_config = json.load(file)

        model_config_str = json.dumps(model_config)
        # Apply the saved configuration to the model
        model.load_config(model_config_str)

        return model
    except Exception as err:
        if raise_exception or is_debug():
            raise err
        print(f'[ERROR] XGBoost.load_model: {err}')

    return None


def save_model(
    booster: Any,
    model_dir: str,
    model_filename: str = UBJSON_MODEL_FILENAME,
    config_filename: str = CONFIG_JSON_FILE,
    image_filename: str = MEDIA_IMAGE_VISUALIZATION_FILE,
    raise_exception: bool = True,
) -> bool:
    if not is_booster_trained(booster, raise_exception=raise_exception):
        return False

    os.makedirs(model_dir, exist_ok=True)

    # Save detailed configuration of the model that includes all the hyperparameters
    # and settings
    model_path = os.path.join(model_dir, model_filename)
    booster.save_model(model_path)

    # Save the structure of the trees (for tree-based models like gradient boosting)
    # along with some basic configurations necessary to understand the model structure itself
    config_path = os.path.join(model_dir, config_filename)
    with open(config_path, 'w') as f:
        f.write(booster.save_config())

    if image_filename:
        image_path = os.path.join(model_dir, image_filename)
        try:
            create_tree_visualization(booster, image_path=image_path)
        except Exception as err:
            print(f'[ERROR] XGBoost.load_model: {err}')

    return True


def create_tree_visualization(
    model: Any,
    image_path: Optional[str] = None,
    max_trees: int = 12,
    num_trees: int = 0,
) -> str:
    try:
        import xgboost as xgb

        if image_path:
            # Remove the '.png' extension when specifying the filename
            base_image_path = image_path.rsplit('.', 1)[0] if '.' in image_path else image_path

            trees_to_render = 0
            n_trees = model.num_boosted_rounds()
            if n_trees > max_trees:
                trees_to_render = max_trees
            elif n_trees == max_trees:
                trees_to_render = 0
            elif num_trees < max_trees:
                trees_to_render = num_trees

            graph = xgb.to_graphviz(model, num_trees=trees_to_render, rankdir='TB', format='png')
            # Pass the adjusted filename without the extension
            graph.render(filename=base_image_path, cleanup=True, format='png')
            # Since the 'format' is 'png', Graphviz will output 'visualization.png'
            return image_path

        from PIL import Image

        # Increase the maximum allowed image size to, say, 500 million pixels
        Image.MAX_IMAGE_PIXELS = 1024 * 1024 * 500

        # Generate a graph of the N trees
        graph = xgb.to_graphviz(model, num_trees=num_trees, rankdir='TB', format='png')

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
    except Exception as err:
        print(f'[ERROR] XGBoost.create_tree_visualization: {err}')
        return str(err)


def create_tree_plot(model: Any, image_path: str, num_trees: int = 0) -> str:
    try:
        import matplotlib.pyplot as plt
        import xgboost as xgb

        plt.close('all')

        plt.figure(dpi=300)
        xgb.plot_tree(model, num_trees=5)
        plt.tight_layout()

        plt.savefig(image_path, dpi=300, bbox_inches='tight')

        plt.close()

        return image_path
    except Exception as err:
        print(f'[ERROR] XGBoost.create_tree_plot: {err}')
        return str(err)


def render_tree_visualization(
    image_dir: str,
    image_filename: str = MEDIA_IMAGE_VISUALIZATION_FILE,
) -> str:
    # Load the model’s tree from a PNG file into base64 format
    try:
        image_path = os.path.join(image_dir, image_filename)
        with open(image_path, 'rb') as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return encoded_string
    except Exception as err:
        print(f'[ERROR] XGBoost.render_tree_visualization: {err}')
        return str(err)
