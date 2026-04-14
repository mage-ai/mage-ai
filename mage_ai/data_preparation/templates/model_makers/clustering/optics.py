import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import OPTICS
from sklearn.metrics import davies_bouldin_score, silhouette_score

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(X, labels, metrics):
    # Exclude noise points (label == -1) for metric calculation
    mask = labels != -1
    n_noise = int((~mask).sum())
    n_clusters = len(set(labels[mask])) if mask.any() else 0

    print(f'  Clusters found : {n_clusters}')
    print(f'  Noise points   : {n_noise}')

    results = {}
    if mask.any() and n_clusters > 1:
        available = {
            'silhouette':     lambda: silhouette_score(X[mask], labels[mask], sample_size=min(mask.sum(), 5000)),
            'davies_bouldin': lambda: davies_bouldin_score(X[mask], labels[mask]),
        }
        results = {m: available[m]() for m in metrics if m in available}

    print('\n===== Clustering Metrics (OPTICS) =====')
    for name, value in results.items():
        print(f'  {name:<16}: {value:.4f}')
    print('=======================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    min_samples = kwargs.get('min_samples', 5)
    xi = kwargs.get('xi', 0.05)
    min_cluster_size = kwargs.get('min_cluster_size', 0.05)
    metrics = kwargs.get('metrics', ['silhouette', 'davies_bouldin'])

    model = OPTICS(
        min_samples=min_samples,
        xi=xi,
        min_cluster_size=min_cluster_size,
    )
    model.fit(df)

    labels = model.labels_
    _print_metrics(np.array(df), labels, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_optics_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
