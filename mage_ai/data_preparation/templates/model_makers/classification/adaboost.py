import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.ensemble import AdaBoostClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


def _print_metrics(y_test, y_pred, metrics):
    available = {
        'accuracy':  lambda: accuracy_score(y_test, y_pred),
        'f1':        lambda: f1_score(y_test, y_pred, average='weighted', zero_division=0),
        'precision': lambda: precision_score(y_test, y_pred, average='weighted', zero_division=0),
        'recall':    lambda: recall_score(y_test, y_pred, average='weighted', zero_division=0),
    }
    results = {m: available[m]() for m in metrics if m in available}
    print('\n===== Classification Metrics (Test Set) =====')
    for name, value in results.items():
        print(f'  {name:<12}: {value:.4f}')
    print('=============================================\n')
    return results


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    target_column = kwargs.get('target_column', 'target')
    test_size = kwargs.get('test_size', 0.2)
    random_state = kwargs.get('random_state', 42)
    metrics = kwargs.get('metrics', ['accuracy', 'f1', 'precision', 'recall'])

    X = df.drop(columns=[target_column])
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    model = AdaBoostClassifier(
        n_estimators=100,
        learning_rate=1.0,
        random_state=random_state,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    _print_metrics(y_test, y_pred, metrics)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"classification_adaboost_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
