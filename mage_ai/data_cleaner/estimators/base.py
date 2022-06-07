from sklearn import base


class BaseEstimator(base.BaseEstimator):
    def fit(self, X, y=None):
        return self

    def fit_transform(self, X, y=None):
        self.fit(X, y)
        return self.transform(X)

    def transform(self, X, **kwargs):
        return X
