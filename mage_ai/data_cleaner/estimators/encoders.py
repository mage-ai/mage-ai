from collections import OrderedDict
from mage_ai.data_cleaner.estimators.base import BaseEstimator
from mage_ai.shared.conversions import fd_to_df, np_to_fd
from mage_ai.shared.multi import execute_parallel
from sklearn.preprocessing import LabelEncoder
import numpy as np


class CustomLabelEncoder(BaseEstimator):
    def __init__(self):
        self.encoder = LabelEncoder()
        self.fitted = False
        self.label_values = []
        self.unknown_class = None

    def inverse_transform(self, y):
        return self.encoder.inverse_transform(y)

    def fit(self, X, y=None):
        self.encoder.fit(X)
        self.fitted = True
        return self

    def transform(self, X, **kwargs):
        self.label_values = sorted(set(X))
        class_mappings = dict(
            zip(
                [str(c) for c in self.encoder.classes_],
                self.encoder.transform(self.encoder.classes_),
            ),
        )
        missing_value = len(self.encoder.classes_)
        unknown_found = False

        def _build(x):
            v = class_mappings.get(str(x))
            if v is None:
                return missing_value
            return v
        if unknown_found:
            # TODO(christhetree): why are these multiplied by 2?
            if np.issubdtype(X.dtype, np.floating):
                self.unknown_class = float(self.label_values[-1] * 2)
            elif np.issubdtype(X.dtype, np.integer):
                self.unknown_class = int(self.label_values[-1] * 2)
            else:
                self.unknown_class = 'unknown_class_'
        y = np.array([_build(x) for x in X])
        return y

    def label_classes(self):
        if self.unknown_class:
            return self.encoder.classes_ + [self.unknown_class]
        return self.encoder.classes_


class MultipleColumnLabelEncoder(BaseEstimator):
    def __init__(self, input_type=None):
        self.input_type = input_type
        self.encoders = {}

    def fit(self, X, y=None):
        execute_parallel(
            [(self.fit_column, [X[column], column]) for column in X.columns],
        )
        return self

    def fit_column(self, X, column):
        self.encoders[column] = CustomLabelEncoder()
        if self.input_type:
            self.encoders[column].fit(X.apply(self.input_type))
        else:
            self.encoders[column].fit(X)

    def transform(self, X, parallel=False):
        if parallel:
            output_dict = OrderedDict()
            output_dicts = execute_parallel(
                [(self.transform_column, [X[column], column]) for column in X.columns],
            )

            for od in output_dicts:
                output_dict.update(od)
            return fd_to_df(output_dict)

        X_output = X.copy(deep=True)
        for col in X_output.columns:
            if self.input_type:
                X_output[col] = self.encoders[col].transform(
                    X_output[col].apply(self.input_type),
                )
            else:
                X_output[col] = self.encoders[col].transform(X_output[col])
        return X_output

    def transform_column(self, X, column):
        if self.input_type:
            nd_arr = self.encoders[column].transform(X.apply(self.input_type))
        else:
            nd_arr = self.encoders[column].transform(X)
        return np_to_fd(nd_arr, feature_names=[column])
