import os
from datetime import datetime

import numpy as np
import pandas as pd
from catboost import CatBoostRanker, Pool
from sklearn.metrics import ndcg_score
from sklearn.model_selection import GroupShuffleSplit

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(y_true, y_pred, group_ids, metrics):
    """Compute per-group ranking metrics and print a summary."""
    unique_groups = np.unique(group_ids)
    ndcg_scores, mrr_scores = [], []

    for gid in unique_groups:
        mask = group_ids == gid
        true_g = y_true[mask]
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

    print('\n===== Ranking Metrics (Test Set) =====')
    for name, value in results.items():
        print(f'  {name:<6}: {value:.4f}')
    print('======================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    """
    Train a CatBoost ranker model for recommendation tasks.

    The dataset should have one row per (user, item) pair, a numeric relevance
    target, and any number of user/item feature columns.

    Configurable via kwargs
    -----------------------
    target_column      : str   — relevance/rating column to rank by         (default: auto-detected or 'relevance')
    group_column       : str   — user/customer ID column for query groups    (default: auto-detected or 'customer_id')
    categorical_columns: list  — columns passed as cat_features to CatBoost;
                                 auto-detected from object/category dtypes
                                 if not given                                (default: auto-detect)
    drop_columns       : list  — columns to exclude from features            (default: [])
    test_size          : float — fraction of groups held out for eval        (default: 0.2)
    random_state       : int   — random seed                                 (default: 42)
    iterations         : int   — number of boosting rounds                   (default: 100)
    learning_rate      : float — step size shrinkage                         (default: 0.1)
    depth              : int   — maximum tree depth                          (default: 6)
    loss_function      : str   — CatBoost ranking loss                       (default: 'YetiRank')
    metrics            : list  — ranking metrics to print                    (default: ['ndcg', 'mrr'])

    Expected dataset shape (example)
    ---------------------------------
    customer_id | age | gender | product | ... | relevance
    ------------|-----|--------|---------|-----|----------
    1           | 34  | M      | Life    | ... | 3
    1           | 34  | M      | Auto    | ... | 1
    2           | 52  | F      | Health  | ... | 2
    """
    target_column = kwargs.get('target_column', None)
    group_column = kwargs.get('group_column', None)
    categorical_columns = kwargs.get('categorical_columns', None)
    drop_columns = kwargs.get('drop_columns', [])
    test_size = kwargs.get('test_size', 0.2)
    random_state = kwargs.get('random_state', 42)
    iterations = kwargs.get('iterations', 100)
    learning_rate = kwargs.get('learning_rate', 0.1)
    depth = kwargs.get('depth', 6)
    loss_function = kwargs.get('loss_function', 'YetiRank')
    metrics = kwargs.get('metrics', ['ndcg', 'mrr'])

    df = df.copy()
    if drop_columns:
        df = df.drop(columns=drop_columns, errors='ignore')

    # Auto-detect target column: prefer 'relevance', else last numeric column
    if target_column is None:
        target_column = 'relevance' if 'relevance' in df.columns else df.select_dtypes('number').columns[-1]

    # Auto-detect group column: prefer 'customer_id'/'user_id', else first int-like column
    if group_column is None:
        candidates = [c for c in df.columns if c in ('customer_id', 'user_id', 'group_id')]
        group_column = candidates[0] if candidates else df.select_dtypes('number').columns[0]

    # Auto-detect categorical columns from object/category dtypes
    if categorical_columns is None:
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()

    X = df.drop(columns=[target_column, group_column])
    y = df[target_column]
    group_ids = df[group_column]

    # Resolve categorical column indices for CatBoost Pool
    cat_feature_indices = [X.columns.get_loc(c) for c in categorical_columns if c in X.columns]

    # Group-aware split: keeps all items of a user together in the same fold
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(splitter.split(X, y, group_ids))

    X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
    X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]
    g_train = group_ids.iloc[train_idx]
    g_test = group_ids.iloc[test_idx]

    # CatBoost Pool accepts group_id directly — no manual sorting needed
    train_pool = Pool(X_train, y_train, group_id=g_train, cat_features=cat_feature_indices)
    test_pool = Pool(X_test, y_test, group_id=g_test, cat_features=cat_feature_indices)

    model = CatBoostRanker(
        iterations=iterations,
        learning_rate=learning_rate,
        depth=depth,
        loss_function=loss_function,
        random_seed=random_state,
        verbose=False,
    )
    model.fit(train_pool, eval_set=test_pool)

    y_pred = model.predict(X_test)
    _print_metrics(y_test.values, y_pred, g_test.values, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"recommendation_catboost_{datetime.now().strftime('%Y%m%d')}.cbm"
        model.save_model(os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
