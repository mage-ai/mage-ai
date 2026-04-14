import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.cluster import AgglomerativeClustering
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
    print('\n===== Clustering Metrics (Agglomerative) =====')
    for name, value in results.items():
        print(f'  {name:<16}: {value:.4f}')
    print('==============================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    n_clusters = kwargs.get('n_clusters', 8)
    linkage = kwargs.get('linkage', 'ward')
    metrics = kwargs.get('metrics', ['silhouette', 'davies_bouldin'])

    model = AgglomerativeClustering(
        n_clusters=n_clusters,
        linkage=linkage,
    )
    labels = model.fit_predict(df)

    print(f'Number of clusters: {n_clusters}')
    print(f'Unique labels: {sorted(set(labels))}')
    _print_metrics(df, labels, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_agglomerative_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
