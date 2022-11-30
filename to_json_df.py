import io
import pandas as pd
import requests
from pandas import DataFrame
import pymongo
import json
from io import StringIO
import csv


def newcsv(data, csvheader, fieldnames):
    """
    Create a new csv file that represents generated data.
    """
    new_csvfile = StringIO.StringIO()
    wr = csv.writer(new_csvfile, quoting=csv.QUOTE_ALL)
    wr.writerow(csvheader)
    wr = csv.DictWriter(new_csvfile, fieldnames = fieldnames)

    for key in data.keys():
        wr.writerow(data[key])

    return new_csvfile

# client = pymongo.MongoClient('host.docker.internal', 27017)
client = pymongo.MongoClient('localhost', 27017)
db = client['chotot']

# get data from mongodb
df = pd.DataFrame(list(db['product'].find()))
pd.set_option('display.max_colwidth', None)
# _sample = df.iloc[:10]
_sample = df.iloc[:1]
_columns = _sample.columns.tolist()[:30]
# _rows = json.loads(_sample.to_json(orient='split'))['data']
# print(_sample.to_json(orient='split'))
print(_sample.head(1))

# df = pd.DataFrame([[1, 2], [3, 4]],
#     index=['2018-03-27 09:30:00 ò', '2018-03-27 09:31:00'],
#     columns=['UNH', 'V'])

# df.reset_index(level=0, inplace=True)

# xx = df.to_json(orient='records')
# xx = _sample.to_json(orient='records')

# csvfile = newcsv(_sample, csvheader, fieldnames)

# run_jsonifier(_sample)
# print(run_jsonifier(_sample))
# print(_sample.to_json())
# print(xx)