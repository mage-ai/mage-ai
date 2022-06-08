import os
import pandas as pd

DIR_PATH = os.path.abspath(os.path.dirname(__file__))


def list_dataset_names():
    paths = os.listdir(DIR_PATH)
    dataset_names = []
    for path in paths:
        if path.endswith('.csv'):
            dataset_names.append(path.split('/')[-1])
    return dataset_names


def load_dataset(name):
    fpath = os.path.join(DIR_PATH, name)
    if not os.path.isfile(fpath):
        raise Exception(f'Dataset {name} is not available')
    return pd.read_csv(fpath)
