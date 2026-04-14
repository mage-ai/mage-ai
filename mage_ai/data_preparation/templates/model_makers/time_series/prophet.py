import os
from datetime import datetime

import numpy as np
import pandas as pd

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True

# Requires: pip install prophet


def _print_metrics(y_true, y_pred, metrics):
    available = {
        'rmse': lambda: float(np.sqrt(np.mean((y_true - y_pred) ** 2))),
        'mae':  lambda: float(np.mean(np.abs(y_true - y_pred))),
        'mape': lambda: float(np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Time Series Metrics (Prophet) =====')
    for name, value in results.items():
        print(f'  {name:<6}: {value:.4f}')
    print('=========================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    """
    Train a Prophet time series model.

    Expected DataFrame columns:
      - ds : datetime column (date or timestamp)
      - y  : numeric target column to forecast

    Rename your columns to 'ds' and 'y' before running, or set
    'date_column' and 'target_column' in kwargs to map them automatically.
    """
    from prophet import Prophet

    date_column = kwargs.get('date_column', 'ds')
    target_column = kwargs.get('target_column', 'y')
    test_size = kwargs.get('test_size', 0.2)
    seasonality_mode = kwargs.get('seasonality_mode', 'additive')
    yearly_seasonality = kwargs.get('yearly_seasonality', 'auto')
    weekly_seasonality = kwargs.get('weekly_seasonality', 'auto')
    daily_seasonality = kwargs.get('daily_seasonality', 'auto')
    metrics = kwargs.get('metrics', ['rmse', 'mae', 'mape'])

    prophet_df = df[[date_column, target_column]].rename(
        columns={date_column: 'ds', target_column: 'y'}
    )
    prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
    prophet_df = prophet_df.sort_values('ds').reset_index(drop=True)

    split_idx = int(len(prophet_df) * (1 - test_size))
    train_df = prophet_df.iloc[:split_idx]
    test_df = prophet_df.iloc[split_idx:]

    model = Prophet(
        seasonality_mode=seasonality_mode,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        daily_seasonality=daily_seasonality,
    )
    model.fit(train_df)

    if len(test_df) > 0:
        forecast = model.predict(test_df[['ds']])
        y_true = test_df['y'].values
        y_pred = forecast['yhat'].values
        _print_metrics(y_true, y_pred, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        import json
        from prophet.serialize import model_to_json
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"time_series_prophet_{datetime.now().strftime('%Y%m%d')}.json"
        filepath = os.path.join(models_dir, filename)
        with open(filepath, 'w') as f:
            f.write(model_to_json(model))
        print(f'Model saved to {filepath}')

    return model
