import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.cluster import KMeans

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    n_clusters = kwargs.get('n_clusters', 8)
    random_state = kwargs.get('random_state', 42)

    model = KMeans(
        n_clusters=n_clusters,
        random_state=random_state,
        n_init='auto',
    )
    model.fit(df)

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"clustering_kmeans_{datetime.now().strftime('%Y%m%d')}.joblib"
        joblib.dump(model, os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return model
