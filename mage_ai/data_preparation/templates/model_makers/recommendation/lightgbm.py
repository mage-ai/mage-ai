import os
from datetime import datetime

import numpy as np
import lightgbm as lgb
import pandas as pd
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
    Train a LightGBM ranker model for recommendation tasks.

    The dataset should have one row per (user, item) pair, a numeric relevance
    target, and any number of user/item feature columns.

    Configurable via kwargs
    -----------------------
    target_column      : str   — relevance/rating column to rank by         (default: auto-detected or 'relevance')
    group_column       : str   — user/customer ID column for query groups    (default: auto-detected or 'customer_id')
    categorical_columns: list  — columns treated as categoricals natively;
                                 auto-detected from object/category dtypes
                                 if not given                                (default: auto-detect)
    drop_columns       : list  — columns to exclude from features            (default: [])
    test_size          : float — fraction of groups held out for eval        (default: 0.2)
    random_state       : int   — random seed                                 (default: 42)
    n_estimators       : int   — number of boosting rounds                   (default: 100)
    learning_rate      : float — step size shrinkage                         (default: 0.1)
    max_depth          : int   — maximum tree depth; -1 means no limit       (default: -1)
    objective          : str   — LightGBM ranking objective                  (default: 'lambdarank')
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
    n_estimators = kwargs.get('n_estimators', 100)
    learning_rate = kwargs.get('learning_rate', 0.1)
    max_depth = kwargs.get('max_depth', -1)
    objective = kwargs.get('objective', 'lambdarank')
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

    # LightGBM handles categoricals natively — cast to 'category' dtype
    for col in categorical_columns:
        df[col] = df[col].astype('category')

    X = df.drop(columns=[target_column, group_column])
    y = df[target_column]
    groups = df[group_column]

    # Group-aware split: keeps all items of a user together in the same fold
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(splitter.split(X, y, groups))

    X_train, y_train, g_train = X.iloc[train_idx], y.iloc[train_idx], groups.iloc[train_idx]
    X_test, y_test, g_test = X.iloc[test_idx], y.iloc[test_idx], groups.iloc[test_idx]

    # LGBMRanker requires rows sorted by group and group sizes as a 1-D array
    def sort_by_group(X_, y_, g_):
        order = g_.argsort()
        X_ = X_.iloc[order]
        y_ = y_.iloc[order]
        g_ = g_.iloc[order]
        sizes = g_.groupby(g_).size().values
        return X_, y_, g_, sizes

    X_train, y_train, g_train, group_train_sizes = sort_by_group(X_train, y_train, g_train)
    X_test, y_test, g_test, group_test_sizes = sort_by_group(X_test, y_test, g_test)

    active_cat_cols = [c for c in categorical_columns if c in X_train.columns]

    model = lgb.LGBMRanker(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=max_depth,
        objective=objective,
        random_state=random_state,
    )
    model.fit(
        X_train, y_train,
        group=group_train_sizes,
        eval_set=[(X_test, y_test)],
        eval_group=[group_test_sizes],
        categorical_feature=active_cat_cols if active_cat_cols else 'auto',
    )

    y_pred = model.predict(X_test)
    _print_metrics(y_test.values, y_pred, g_test.values, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"recommendation_lightgbm_{datetime.now().strftime('%Y%m%d')}.txt"
        model.booster_.save_model(os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
