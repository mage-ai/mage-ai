from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_squared_error,
    precision_score,
    recall_score,
)
import numpy as np
import pandas as pd

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker


@model_maker
def evaluate_model(model, df: pd.DataFrame, *args, **kwargs):
    """
    Evaluates a trained model on a test dataframe.

    Args:
        model: A trained model with a .predict() method (from an upstream Model Maker block).
        df:    Test dataframe with a target column.
        target_column (str, kwarg): Name of the target column (default: 'target').
        task (str, kwarg): 'classification' or 'regression' (default: 'classification').

    Returns:
        Dictionary of evaluation metrics.
    """
    target_col = kwargs.get('target_column', 'target')
    task = kwargs.get('task', 'classification')

    X = df.drop(columns=[target_col])
    y = df[target_col]
    preds = model.predict(X)

    if task == 'classification':
        metrics = {
            'accuracy': accuracy_score(y, preds),
            'precision': precision_score(y, preds, average='weighted'),
            'recall': recall_score(y, preds, average='weighted'),
            'f1': f1_score(y, preds, average='weighted'),
        }
    else:
        metrics = {
            'rmse': np.sqrt(mean_squared_error(y, preds)),
            'mse': mean_squared_error(y, preds),
        }

    print(metrics)
    return metrics
