import os
from datetime import datetime

import numpy as np
import pandas as pd

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True

# Requires: pip install statsmodels


def _print_metrics(y_true, y_pred, aic, bic, metrics):
    available = {
        'rmse': lambda: float(np.sqrt(np.mean((y_true - y_pred) ** 2))),
        'mae':  lambda: float(np.mean(np.abs(y_true - y_pred))),
        'mape': lambda: float(np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100),
        'aic':  lambda: float(aic),
        'bic':  lambda: float(bic),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Time Series Metrics (ARIMA) =====')
    for name, value in results.items():
        print(f'  {name:<6}: {value:.4f}')
    print('=======================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    """
    Train an ARIMA time series model.

    Expected DataFrame columns:
      - ds           : datetime column (date or timestamp)
      - target_column: numeric column to forecast (default: 'y')

    The series is sorted by 'ds' before fitting. Set the frequency
    via 'freq' (e.g. 'D', 'W', 'M', 'H') to match your data.
    """
    from statsmodels.tsa.arima.model import ARIMA

    date_column = kwargs.get('date_column', 'ds')
    target_column = kwargs.get('target_column', 'y')
    p = kwargs.get('p', 1)
    d = kwargs.get('d', 1)
    q = kwargs.get('q', 1)
    freq = kwargs.get('freq', None)
    test_size = kwargs.get('test_size', 0.2)
    metrics = kwargs.get('metrics', ['rmse', 'mae', 'aic', 'bic'])

    series_df = df[[date_column, target_column]].rename(
        columns={date_column: 'ds', target_column: 'y'}
    )
    series_df['ds'] = pd.to_datetime(series_df['ds'])
    series_df = series_df.sort_values('ds').set_index('ds')

    if freq:
        series_df = series_df.asfreq(freq)

    series = series_df['y']
    split_idx = int(len(series) * (1 - test_size))
    train_series = series.iloc[:split_idx]
    test_series = series.iloc[split_idx:]

    model = ARIMA(train_series, order=(p, d, q))
    result = model.fit()

    print(result.summary())

    y_pred = None
    if len(test_series) > 0:
        forecast = result.forecast(steps=len(test_series))
        y_true = test_series.values
        y_pred = forecast.values
        _print_metrics(y_true, y_pred, result.aic, result.bic, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"time_series_arima_{datetime.now().strftime('%Y%m%d')}.pkl"
        filepath = os.path.join(models_dir, filename)
        result.save(filepath)
        print(f'Model saved to {filepath}')

    return result
