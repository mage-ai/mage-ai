import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(X, labels, inertia, metrics):
    available = {
        'inertia':         lambda: inertia,
        'silhouette':      lambda: silhouette_score(X, labels, sample_size=min(len(X), 5000)),
        'davies_bouldin':  lambda: davies_bouldin_score(X, labels),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Clustering Metrics (KMeans) =====')
    for name, value in results.items():
        print(f'  {name:<16}: {value:.4f}')
    print('=======================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    n_clusters = kwargs.get('n_clusters', 8)
    random_state = kwargs.get('random_state', 42)
    metrics = kwargs.get('metrics', ['inertia', 'silhouette', 'davies_bouldin'])

    model = KMeans(
        n_clusters=n_clusters,
        random_state=random_state,
        n_init='auto',
    )
    model.fit(df)

    _print_metrics(df, model.labels_, model.inertia_, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_kmeans_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
