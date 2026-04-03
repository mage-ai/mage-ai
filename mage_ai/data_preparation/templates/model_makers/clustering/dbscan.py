import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.cluster import DBSCAN

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    eps = kwargs.get('eps', 0.5)
    min_samples = kwargs.get('min_samples', 5)

    model = DBSCAN(
        eps=eps,
        min_samples=min_samples,
    )
    model.fit(df)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_dbscan_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
