import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.metrics import davies_bouldin_score, silhouette_score

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(X, labels, metrics):
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int(np.sum(labels == -1))

    base = {
        'n_clusters': n_clusters,
        'n_noise':    n_noise,
    }
    computed = {}
    if 'silhouette' in metrics and n_clusters > 1:
        mask = labels != -1
        if mask.sum() > 1:
            computed['silhouette'] = silhouette_score(
                X[mask], labels[mask], sample_size=min(mask.sum(), 5000)
            )
    if 'davies_bouldin' in metrics and n_clusters > 1:
        mask = labels != -1
        if mask.sum() > 1:
            computed['davies_bouldin'] = davies_bouldin_score(X[mask], labels[mask])

    print('\n===== Clustering Metrics (DBSCAN) =====')
    for name, value in base.items():
        print(f'  {name:<16}: {value}')
    for name, value in computed.items():
        print(f'  {name:<16}: {value:.4f}')
    print('=======================================\n')
    return {**base, **computed}


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    eps = kwargs.get('eps', 0.5)
    min_samples = kwargs.get('min_samples', 5)
    metrics = kwargs.get('metrics', ['n_clusters', 'n_noise', 'silhouette', 'davies_bouldin'])

    model = DBSCAN(
        eps=eps,
        min_samples=min_samples,
    )
    model.fit(df)

    _print_metrics(df.values, model.labels_, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_dbscan_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
