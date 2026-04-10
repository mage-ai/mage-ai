import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    davies_bouldin_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    ndcg_score,
    precision_score,
    r2_score,
    recall_score,
    silhouette_score,
)

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker


@model_maker
def evaluate_model(model, df: pd.DataFrame, *args, **kwargs):
    """
    Evaluate a trained model and print metrics based on the task type.

    Args
    ----
    model         : trained model with a .predict() method (from an upstream Model Maker block)
    df            : dataframe containing features and (where applicable) a target column

    Configurable via kwargs
    -----------------------
    task          : str  — 'classification', 'regression', 'clustering', or 'recommendation'
                           (default: 'classification')
    target_column : str  — name of the target/relevance column
                           (default: 'target'; ignored for clustering)
    group_column  : str  — user/query ID column, required for 'recommendation'
                           (default: auto-detected or 'customer_id')
    metrics       : list — metric names to compute; defaults depend on task:
                           classification  → ['accuracy', 'f1', 'precision', 'recall']
                           regression      → ['rmse', 'mae', 'r2']
                           clustering      → ['silhouette', 'davies_bouldin']
                           recommendation  → ['ndcg', 'mrr']

    Returns
    -------
    dict of computed metric name → value
    """
    task = kwargs.get('task', 'classification')
    target_column = kwargs.get('target_column', 'target')
    group_column = kwargs.get('group_column', None)
    metrics = kwargs.get('metrics', None)

    # ── Classification ────────────────────────────────────────────────────────
    if task == 'classification':
        if metrics is None:
            metrics = ['accuracy', 'f1', 'precision', 'recall']
        X = df.drop(columns=[target_column])
        y = df[target_column]
        y_pred = model.predict(X)
        available = {
            'accuracy':  lambda: accuracy_score(y, y_pred),
            'f1':        lambda: f1_score(y, y_pred, average='weighted', zero_division=0),
            'precision': lambda: precision_score(y, y_pred, average='weighted', zero_division=0),
            'recall':    lambda: recall_score(y, y_pred, average='weighted', zero_division=0),
        }
        results = {m: available[m]() for m in metrics if m in available}
        print('\n===== Classification Metrics =====')
        for name, value in results.items():
            print(f'  {name:<12}: {value:.4f}')
        print('==================================\n')

    # ── Regression ────────────────────────────────────────────────────────────
    elif task == 'regression':
        if metrics is None:
            metrics = ['rmse', 'mae', 'r2']
        X = df.drop(columns=[target_column])
        y = df[target_column]
        y_pred = model.predict(X)
        available = {
            'rmse': lambda: float(np.sqrt(mean_squared_error(y, y_pred))),
            'mae':  lambda: float(mean_absolute_error(y, y_pred)),
            'r2':   lambda: float(r2_score(y, y_pred)),
        }
        results = {m: available[m]() for m in metrics if m in available}
        print('\n===== Regression Metrics =====')
        for name, value in results.items():
            print(f'  {name:<6}: {value:.4f}')
        print('==============================\n')

    # ── Clustering ────────────────────────────────────────────────────────────
    elif task == 'clustering':
        if metrics is None:
            metrics = ['silhouette', 'davies_bouldin']
        labels = model.labels_ if hasattr(model, 'labels_') else model.predict(df)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        mask = labels != -1
        results = {'n_clusters': n_clusters}
        if n_clusters > 1 and mask.sum() > 1:
            X_valid = df.values[mask]
            labels_valid = labels[mask]
            if 'silhouette' in metrics:
                results['silhouette'] = silhouette_score(
                    X_valid, labels_valid, sample_size=min(len(X_valid), 5000)
                )
            if 'davies_bouldin' in metrics:
                results['davies_bouldin'] = davies_bouldin_score(X_valid, labels_valid)
        if hasattr(model, 'inertia_') and 'inertia' in metrics:
            results['inertia'] = model.inertia_
        print('\n===== Clustering Metrics =====')
        for name, value in results.items():
            fmt = f'{value:.4f}' if isinstance(value, float) else str(value)
            print(f'  {name:<16}: {fmt}')
        print('==============================\n')

    # ── Recommendation / Ranking ──────────────────────────────────────────────
    elif task == 'recommendation':
        if metrics is None:
            metrics = ['ndcg', 'mrr']
        if group_column is None:
            candidates = [c for c in df.columns if c in ('customer_id', 'user_id', 'group_id')]
            group_column = candidates[0] if candidates else df.select_dtypes('number').columns[0]
        X = df.drop(columns=[target_column, group_column])
        y = df[target_column].values
        group_ids = df[group_column].values
        y_pred = model.predict(X)

        unique_groups = np.unique(group_ids)
        ndcg_scores, mrr_scores = [], []
        for gid in unique_groups:
            mask = group_ids == gid
            true_g = y[mask]
            pred_g = y_pred[mask]
            if len(true_g) < 2:
                continue
            if 'ndcg' in metrics:
                ndcg_scores.append(ndcg_score([true_g], [pred_g]))
            if 'mrr' in metrics:
                ranked = true_g[np.argsort(-pred_g)]
                best = true_g.max()
                for rank, val in enumerate(ranked, start=1):
                    if val == best:
                        mrr_scores.append(1.0 / rank)
                        break

        results = {}
        if ndcg_scores:
            results['ndcg'] = float(np.mean(ndcg_scores))
        if mrr_scores:
            results['mrr'] = float(np.mean(mrr_scores))
        print('\n===== Ranking Metrics =====')
        for name, value in results.items():
            print(f'  {name:<6}: {value:.4f}')
        print('===========================\n')

    else:
        raise ValueError(f"Unknown task '{task}'. Choose from: classification, regression, clustering, recommendation")

    return results
