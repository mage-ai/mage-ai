import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.cluster import MeanShift, estimate_bandwidth
from sklearn.metrics import davies_bouldin_score, silhouette_score

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(X, labels, metrics):
    available = {
        'silhouette':     lambda: silhouette_score(X, labels, sample_size=min(len(X), 5000)),
        'davies_bouldin': lambda: davies_bouldin_score(X, labels),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Clustering Metrics (Mean Shift) =====')
    for name, value in results.items():
        print(f'  {name:<16}: {value:.4f}')
    print('===========================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    bandwidth = kwargs.get('bandwidth', None)
    metrics = kwargs.get('metrics', ['silhouette', 'davies_bouldin'])

    # Auto-estimate bandwidth if not provided
    if bandwidth is None:
        bandwidth = estimate_bandwidth(df, quantile=0.2, n_samples=min(len(df), 500))

    model = MeanShift(bandwidth=bandwidth, bin_seeding=True)
    model.fit(df)

    labels = model.labels_
    n_clusters = len(set(labels))
    print(f'Clusters found: {n_clusters}  (bandwidth={bandwidth:.4f})')

    if n_clusters > 1:
        _print_metrics(df, labels, metrics)
    else:
        print('Only one cluster found — skipping silhouette/davies_bouldin.\n')

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_mean_shift_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
