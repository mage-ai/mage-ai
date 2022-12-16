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


def load_titanic():
    return load_dataset('titanic_survival.csv')


def load_product_purchases():
    return load_dataset('product_purchases.csv')


def load_salary_survey():
    return load_dataset('salary_survey.csv')


def load_user_emails():
    return load_dataset('user_emails.csv')
