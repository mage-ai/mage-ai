from mage_ai.data_cleaner.estimators.base import BaseEstimator
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor

LOF_ANOMALY_SCORE_THRESHOLD = -1.5
ITREE_ANOMALY_SCORE_THRESHOLD = -0.1


class CustomIsolationForest(BaseEstimator):
    def __init__(
        self,
        n_estimators=100,
        max_samples='auto',
        contamination='auto',
        bootstrap=False,
        n_jobs=None,
        random_state=None,
        score_threshold=-0.1,
        verbose=0,
    ):
        self.itree = IsolationForest(
            n_estimators=n_estimators,
            max_samples=max_samples,
            contamination=contamination,
            bootstrap=bootstrap,
            n_jobs=n_jobs,
            random_state=random_state,
            verbose=verbose,
        )
        self.fitted = False
        self.score_threshold = score_threshold

    def fit(self, X, y=None):
        self.itree.fit(X, y)
        self.fitted = True

    def transform(self, X, **kwargs):
        if self.fitted:
            outlier_scores = self.itree.decision_function(X)
            return outlier_scores <= self.score_threshold
        else:
            raise RuntimeError('No mask found, call fit() before attempting to extract mask')


class CustomLocalOutlierFactor(BaseEstimator):
    def __init__(
        self,
        n_neighbors=20,
        algorithm='auto',
        leaf_size=30,
        metric='minkowski',
        p=2,
        metric_params=None,
        contamination='auto',
        novelty=False,
        n_jobs=None,
        score_threshold=-1.5,
    ):
        self.lof = LocalOutlierFactor(
            n_neighbors=n_neighbors,
            algorithm=algorithm,
            leaf_size=leaf_size,
            metric=metric,
            p=p,
            metric_params=metric_params,
            contamination=contamination,
            novelty=novelty,
            n_jobs=n_jobs,
        )
        self.fitted = False
        self.score_threshold = score_threshold

    def fit(self, X, y=None):
        self.lof.fit(X, y)
        self.fitted = True

    def transform(self, X=None, **kwargs):
        outlier_scores = self.lof.negative_outlier_factor_
        return outlier_scores <= self.score_threshold


class OutlierRemoval(BaseEstimator):
    def __init__(self, method='auto') -> None:
        self.method = method

    def fit(self, X, y=None) -> None:
        count, ndim = X.shape
        pca_transformer = PCA(n_components=20, random_state=42)
        if ndim > 20:
            X = pca_transformer.fit_transform(X)
        method = self.method
        if self.method == 'auto':
            if ndim <= 5:
                method = 'lof'
            else:
                method = 'itree'
        if method == 'lof':
            if count < 10:
                n_neighbors = 2
            elif count < 500:
                n_neighbors = count // 10 + 1
            else:
                n_neighbors = 20
            self.outlier_remover = CustomLocalOutlierFactor(
                n_neighbors=n_neighbors, n_jobs=-1, score_threshold=LOF_ANOMALY_SCORE_THRESHOLD
            )
        elif method == 'itree':
            self.outlier_remover = CustomIsolationForest(
                n_estimators=75,
                n_jobs=-1,
                random_state=42,
                score_threshold=ITREE_ANOMALY_SCORE_THRESHOLD,
            )
        else:
            raise ValueError(f'Invalid method specified: {method}')
        self.outlier_remover.fit(X, y)

    def transform(self, X, **kwargs):
        return self.outlier_remover.transform(X, **kwargs)
