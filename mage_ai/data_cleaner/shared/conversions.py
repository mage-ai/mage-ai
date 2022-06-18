"""
Useful conversion functions between Pandas DataFrames, numpy NDArrays, and ordered feature dictionaries
"""

from collections import OrderedDict
import logging
import numpy as np
import pandas as pd
import scipy
import six.moves

logger = logging.getLogger(__name__)


def df_to_fd(x, copy=False, nan_str='null', dtype=None):
    """
    Converts a pandas DataFrame to an ordered dictionary of numpy arrays

    :param x: The input DataFrame
    :param copy: Generates a copy of the underlying data
    :param nan_str: String used for nan values in DF
    :param dtype: The dtypes to cast to (if copying). Otherwise we don't cast.
        Can be a list (one per column) or a single dtype (applies to all features). Implies copy=True
    :return: feature dict representation of pandas DataFrame
    """
    assert isinstance(x, pd.DataFrame), 'input must be a Pandas DataFrame'

    # Find NaN values in object type columns
    nan_indices = {}
    for feat in x:
        if x[feat].dtype == np.dtype('O'):
            nan_indices[feat] = np.where(x[feat].isna().values)[0]

    if dtype and not copy:
        copy = True
    if copy:
        if dtype:
            if isinstance(dtype, list):
                assert len(dtype) == len(
                    list(x)
                ), 'dtypes must be same length as there are features in DataFrame'
                out = OrderedDict((f, x[f].values.astype(dtype[i])) for i, f in enumerate(list(x)))
                for feat in nan_indices:
                    out[feat][nan_indices[feat]] = nan_str
                return out
            else:
                out = OrderedDict((f, x[f].values.astype(dtype)) for f in list(x))
                for feat in nan_indices:
                    out[feat][nan_indices[feat]] = nan_str
                return out
        else:
            out = OrderedDict((f, x[f].values.copy()) for f in list(x))
            for feat in nan_indices:
                out[feat][nan_indices[feat]] = nan_str
            return out

    out = OrderedDict((f, x[f].values.view()) for f in list(x))
    for feat in nan_indices:
        try:
            out[feat][nan_indices[feat]] = nan_str
        except ValueError:
            logger.exception(feat, x[feat].dtype)
    return out


def np_to_fd(x, axes=None, feature_names=None, copy=True, dtype=None):
    """
    Converts a numpy ndarray to an ordered dictionary of numpy ndarrays by transposing
    and slicing on resulting rows (or any other axis)

    :param x: The ndarray. We will slice it across the transpose
    :param axes: How to reorder the axes of a tensor with rank > 2
        This takes a form of a tuple containing the desired ordering of resulting indices.
        We will slice features on the leading dimension following this transpose.

    Example:
    Converting an image batch of 100 1024Hx768W RGB (3 channels) image batch...
    The shape is (100,3,1024,768)

    If we want to extract 3 batches of 100 images each (one batch for each color) we'd do:
    axes=(1,0,2,3) since this maps to (channels=3, batch_size=100, height=1024, width=768)

    This will yield a transposed tensor of shape (3, 100, 1024, 768). We'll then slice on the leading dimension to yield a feature dict::

        {
            'red': ndarray with shape (100, 1024, 768)
            'blue': ndarray with shape (100, 1024, 768)
            'green': ndarray with shape (100, 1024, 768)
        }

    :param feature_names: A list of feature names to use. Otherwise we will auto-generate them
    :param copy: This makes a copy of the data rather than a view.
        We use row-major memory order so we get a contiguous array during column extraction
    :param dtype: The desired resulting numpy dtype (automatic if not specifying). Implies copy=True
    :return: FeatureDict
    """

    if dtype:
        copy = True
    assert isinstance(x, np.ndarray), 'input must be an ndarray'
    # pass-through 1D numpy array
    if x.ndim == 1:
        if feature_names:
            assert len(feature_names) == 1, '1D array detected but multiple feature names'
        fname = feature_names[0] if feature_names else 'c0'
        return OrderedDict([(fname, x)])
    view = x.view()
    view_t = np.transpose(view, axes=axes)
    # we usually want a copy since transpose
    # creates a non-contiguous array in memory for each feature we extract (which breaks some stuff)
    if copy:
        view_t = np.ascontiguousarray(view_t, dtype)
    cols = (
        feature_names
        if feature_names
        else ['c' + str(i) for i in six.moves.xrange(view_t.shape[0])]
    )
    return OrderedDict((cols[i], view_t[i]) for i in six.moves.xrange(view_t.shape[0]))


def sparse_to_dense(x):
    """
    Converts a sparse matrix into its dense representation. Passes through non-sparse matrices

    :param x: The input
    :return: A dense numpy array
    """
    if isinstance(x, scipy.sparse.csr_matrix):
        return x.todense()
    else:
        return x


def as_scalar(x, str_encoding='utf-8'):
    """
    Converts from a non-python scalar type to a Python scalar

    :param x: The scalar object to convert
    :param str_encoding: The encoding to use for converting fixed-width
    numpy strings (np.string_)
    """

    # types which need no further conversion
    PYTHON_SCALAR_TYPES = [
        float,
        int,
        bool,
        np.bool,  # an alias for Python bool but needed here separately
        str,
    ]
    NUMPY_SCALAR_TYPES = [np.bool_, np.str_, np.floating, np.integer]
    if type(x) in PYTHON_SCALAR_TYPES:
        return x
    elif isinstance(x, tuple(NUMPY_SCALAR_TYPES)):
        return x.item()
    elif isinstance(x, (np.string_, np.bytes_)):
        return x.item().decode(str_encoding)
    else:
        raise ValueError('Unknown type {}'.format(str(type(x))))


def fd_to_np(x, method='column_stack', axis=None, dtype=None):
    """
    Vertically stacks features together (by column)

    If there is a single feature, we return just that one

    This requires homogeneous shapes.

    :param x: The feature dict
    :param method: Either column_stack or stack. Refer to numpy docs for more info.
    :param axis: If using stack, the axis to stack on
    :param dtype: The dtype to cast to. Otherwise uses the numpy default
    :return: An ndarray containing the features in order
    """
    assert isinstance(x, OrderedDict), 'expected a feature dictionary'

    # passthrough if a feature
    if len(x) == 1:
        k = list(x.keys())[0]
        if dtype:
            return sparse_to_dense(x[k]).astype(dtype)
        return x[k]

    feature_names = list(x.keys())

    # shape of first feature
    # to ensure the leading dimensions are equal across features
    first_shape = None

    # check shapes and ensure everything is an ndarray
    for feature in feature_names:
        if isinstance(x[feature], np.ndarray):
            pass
        elif isinstance(x[feature], list):
            x[feature] = np.array(x[feature])
        elif isinstance(x[feature], scipy.sparse.csr_matrix):
            x[feature] = sparse_to_dense(x[feature])
        else:
            raise ValueError(
                'Unsupported container tensor type in feature dict: {}'.format(
                    str(type(x[feature]))
                )
            )
        if first_shape is None:
            first_shape = x[feature].shape
        assert first_shape[0] == x[feature].shape[0], 'incompatible shapes: {}, {}'.format(
            first_shape, x[feature].shape
        )
    if method == 'column_stack':
        out = np.column_stack([(x[key]) for key in x])
    elif method == 'stack':
        if axis:
            out = np.stack([(x[key]) for key in x], axis=axis)
        else:
            out = np.stack([(x[key]) for key in x], axis=-2)
    else:
        raise ValueError('unsupported method {}'.format(method))
    if dtype:
        return out.astype(dtype)
    return out


def fd_to_df(x):
    """
    :param x: FeatureDict
    :return: A Pandas DataFrame representation of the FeatureDict
    """
    assert isinstance(x, OrderedDict), 'expected a feature dictionary'
    return pd.DataFrame(x, columns=list(x.keys()))


def is_dtype(x, dtype):
    """
    Checks if a feature dict is all of a given type

    :param x: The feature dict
    :param dtype: The desired dtype
    :return: True if all elements are numpy arrays of the given dtype
    """
    for feat in x:
        if not isinstance(x[feat], np.ndarray):
            return False
        elif x[feat].dtype != dtype:
            return False
    return True


def cast_fd(x, dtype, order='C'):
    """
    Performs a cast of a dict containing numpy arrays

    :param x: The input ordereddict
    :param dtype: The target dtype
    :return: Casted FeatureDict
    """
    o = OrderedDict()
    for feat in x:
        if not isinstance(x[feat], np.ndarray):
            if isinstance(x[feat], list):
                o[feat] = np.array(x[feat]).astype(dtype=dtype, order=order)
            else:
                raise ValueError(
                    'Can only cast lists or numpy arrays. Key {} is of type {}'.format(
                        feat, str(type(x[feat]))
                    )
                )
        else:
            o[feat] = x[feat].astype(dtype=dtype, order=order)
    return o


# todo check memory layout C/Fortran
def to_fd(x, dtype=None):
    """
    Convenience function that auto-detects the type and performs the conversion

    :param x: Input data
    :param dtype: If None, we attempt to pass-through without copies. Doesn't apply to feature dicts
        Note: when passing non-numpy types do not set dtype.
    :return: A FeatureDict
    """
    if isinstance(x, OrderedDict):
        if dtype:
            if not is_dtype(x, dtype):
                return cast_fd(x, dtype)
        return x
    elif isinstance(x, np.ndarray):
        return np_to_fd(x, dtype=dtype)
    elif isinstance(x, pd.DataFrame):
        return df_to_fd(x, dtype=dtype)
    elif isinstance(x, dict):
        if dtype:
            if not is_dtype(x, dtype):
                return cast_fd(x, dtype)
        return OrderedDict((key, x[key]) for key in x)
    else:
        raise NotImplementedError('unknown type {}'.format(str(type(x))))


def to_list(feature):
    """
    Converts a feature of a vector type (pandas series or numpy ndarray)
    to a list native python types

    :param feature: The input feature as a list, numpy ndarray, or pandas Series
    :return: the corresponding data in native python type
    """
    if isinstance(feature, list):
        return [each.item() if isinstance(each, np.generic) else each for each in feature]
    elif isinstance(feature, (np.ndarray, pd.Series)):
        return feature.tolist()
    # handle the unlikely default case: feature_rows is not a list nor ndarray or pandas series
    else:
        return feature
