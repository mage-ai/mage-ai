import os
from datetime import datetime

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(y_test, y_pred, metrics):
    available = {
        'rmse': lambda: float(np.sqrt(mean_squared_error(y_test, y_pred))),
        'mae':  lambda: float(mean_absolute_error(y_test, y_pred)),
        'r2':   lambda: float(r2_score(y_test, y_pred)),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Regression Metrics (Test Set) =====')
    for name, value in results.items():
        print(f'  {name:<6}: {value:.4f}')
    print('=========================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    target_column = kwargs.get('target_column', 'target')
    test_size = kwargs.get('test_size', 0.2)
    random_state = kwargs.get('random_state', 42)
    metrics = kwargs.get('metrics', ['rmse', 'mae', 'r2'])

    X = df.drop(columns=[target_column])
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        random_state=random_state,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    _print_metrics(y_test, y_pred, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"regression_xgboost_{datetime.now().strftime('%Y%m%d')}.json"
        model.save_model(os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
