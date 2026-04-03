import os
from datetime import datetime

import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import recall_score, precision_score, roc_auc_score, f1_score 

if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker

IS_SAVE = True


@model_maker
def train(df: pd.DataFrame, *args, **kwargs):
    target_column = kwargs.get('target_column', 'churn_flag')
    test_size = kwargs.get('test_size', 0.2)
    random_state = kwargs.get('random_state', 42)

    X = df.drop(columns=[target_column])
    y = df[target_column]

    cat_cols = X.select_dtypes(include='object').columns
    X[cat_cols] = X[cat_cols].astype('category')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=6,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=random_state,
        enable_categorical=True
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_proba)
    recall = recall_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(
        f"""
        AUC: {auc}
        Recall: {recall}
        Precision: {recall}
        F1: {recall}
        """
        )

    if IS_SAVE:
        from mage_ai.settings.repo import get_repo_path
        models_dir = os.path.join(get_repo_path(), 'models')
        os.makedirs(models_dir, exist_ok=True)
        filename = f"classification_xgboost_{datetime.now().strftime('%Y%m%d')}.json"
        model.save_model(os.path.join(models_dir, filename))
        print(f'Model saved to {os.path.join(models_dir, filename)}')

    return df