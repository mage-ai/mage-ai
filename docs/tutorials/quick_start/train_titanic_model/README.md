# Train model on Titanic dataset

<img
  alt="Titanic"
  src="https://media.graphcms.com/TIobzTjRniW8wUAna6Ht"
/>

In this tutorial, we’ll create a pipeline that does the following:

1. Load data from an online endpoint
2. Select columns and fill in missing values
4. Train a model to predict which passengers will survive

If you prefer to skip the tutorial and view the finished code,
follow [this guide](use_completed_pipeline.md).

## Table of contents

1. [Setup](#1-setup)
1. [Create new pipeline](#2-create-new-pipeline)
1. [Play around with scratchpad](#3-play-around-with-scratchpad)
1. [Load data](#4-load-data)
1. [Transform data](#5-transform-data)
1. [Train model](#6-train-model)
1. [Run pipeline](#7-run-pipeline)

## 1. Setup

### 1a. Initialize project

In your terminal, run this command:

<b>Docker</b>
```bash
./scripts/init.sh demo_project
```

<b>pip</b>
```bash
mage init demo_project
```

### 2a. Start the tool

<b>Docker</b>
```bash
./scripts/start.sh demo_project
```

<b>pip</b>
```bash
mage start demo_project
```

Open [http://localhost:6789](http://localhost:6789) in your browser.

### 3a. Add Python packages to project

In the left sidebar (aka file browser), click on the `requirements.txt` file under the
`demo_project/` folder.

<img
  alt="requirements"
  src="requirements.png"
/>

Then add the following dependencies to that file:

```text
matplotlib
requests
scikit-learn
```

### 4a. Install dependencies

The simplest way is to run pip install from the tool.

Add a scratchpad block by pressing the `+ Scratchpad` button. Then run the following command:

```bash
%pip install -r demo_project/requirements.txt
```

Alternatively, here are other ways of installing dependencies
(depending on if you are using Docker or not):

<b>Docker</b>

Get the name of the container that is running the tool:

```bash
docker ps
```

Sample output:
```bash
CONTAINER ID   IMAGE       COMMAND                  CREATED         STATUS         PORTS     NAMES
214e1155f5c3   mage/data   "python mage_ai/comm…"   5 seconds ago   Up 2 seconds             mage-ai_server_run_6f8d367ac405
```

The container name in the above sample output is `mage-ai_server_run_6f8d367ac405`.

Then run this command to install Python packages in the `demo_project/requirements.txt` file:

```bash
docker exec [container_name] pip3 install -r demo_project/requirements.txt
```

<b>pip</b>

If you aren’t using Docker, just run the following command in your terminal:

```bash
pip3 install -r demo_project/requirements.txt
```

## 2. Create new pipeline

In the top left corner, click `File > New pipeline`.
Then, click the name of the pipeline next to the green dot to rename it to `titanic survivors`.

<img
  alt="create new pipeline"
  src="create-new-pipeline.gif"
/>

## 3. Play around with scratchpad

There are 4 buttons, click on the `+ Scratchpad` button to add a block.

Paste the following sample code in the block:

```python
import matplotlib.pyplot as plt
import numpy as np


t = np.arange(0.0, 2.0, 0.01)
s = 1 + np.sin(2*np.pi*t)
plt.plot(t, s)

plt.xlabel('time (s)')
plt.ylabel('voltage (mV)')
plt.title('About as simple as it gets, folks')
plt.grid(True)
plt.show()
```

Then click the `Play button` on the right side of the block to run the code.
Alternatively, you can use the following keyboard shortcuts to execute code in the block:

- Command + Enter
- Control + Enter
- Shift + Enter (run code and add a new block)

<img
  alt="scratchpad"
  src="scratchpad.gif"
/>

Now that we’re done with the scratchpad, we can leave it there or delete it.
To delete a block, click the trash can icon on the right side or use the keyboard shortcut by
typing the letter D and then D again.

## 4. Load data

1. Add a new data loader block by clicking the `+ Data loader` button.
1. Rename the block to `load dataset`.
1. Paste the following code and run the block:

```python
from pandas import DataFrame
import io
import pandas as pd
import requests

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data() -> DataFrame:
    response = requests.get(
      'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    )

    return pd.read_csv(io.StringIO(response.text), sep=',')
```

After you run the block, you can immediately see a sample of the data in the block’s output.

<img
  alt="load data"
  src="load-data.gif"
/>

On the far right side of the screen (aka the Sidekick), there are 5 tabs you can explore:

1. Tree: shows the dependencies of each block
1. Data: detailed information of the underlying data
1. Reports: data quality, feature profiles, etc.
1. Graphs: charts
1. Variables: how to access variables produced in other blocks

Every data loader and transformer block will have its own state of information
displayed on the right side.

## 5. Transform data

We’re going to select numerical columns from the original dataset,
then fill in missing values for those columns (aka impute).

1. Add a new transformer block by clicking `+ Transformer` button.
1. Click the link in the top right corner of the block labeled `Click to set parent blocks`.
1. On the right side under the `Tree` tab, select the block named `load_dataset`, then click the `Save dependencies` button.
1. Rename the block to `extract and impute numbers`.
1. Paste the following code in the block:

```python
from pandas import DataFrame
import math


if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


def select_number_columns(df: DataFrame) -> DataFrame:
    return df[['Age', 'Fare', 'Parch', 'Pclass', 'SibSp', 'Survived']]


def fill_missing_values_with_median(df: DataFrame) -> DataFrame:
    for col in df.columns:
        values = sorted(df[col].dropna().tolist())
        median_age = values[math.floor(len(values) / 2)]
        df[[col]] = df[[col]].fillna(median_age)
    return df


@transformer
def transform_df(df: DataFrame, *args) -> DataFrame:
    return fill_missing_values_with_median(select_number_columns(df))
```

<img
  alt="transform data"
  src="transform-data.gif"
/>

## 6. Train model

In this part, we’re going to accomplish the following:

1. Split the dataset into a training set and a test set.
1. Train logistic regression model.
1. Calculate the model’s accuracy score.
1. Save the training set, test set, and model artifact to disk.

Here are the steps to take:

1. Add a new data exporter block by clicking `+ Data exporter` button.
1. Click the link in the top right corner of the block labeled `Click to set parent blocks`.
1. On the right side under the `Tree` tab, select the block named `extract_and_impute_numbers`, then click the `Save dependencies` button.
1. Rename the block to `train model`.
1. Paste the following code in the block:

```python
from pandas import DataFrame
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
import os
import pickle

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


LABEL_COLUMN = 'Survived'


def build_training_and_test_set(df: DataFrame) -> None:
    X = df.drop(columns=[LABEL_COLUMN])
    y = df[LABEL_COLUMN]

    return train_test_split(X, y)


def train_model(X, y) -> None:
    model = LogisticRegression()
    model.fit(X, y)

    return model


def score_model(model, X, y) -> None:
    y_pred = model.predict(X)

    return accuracy_score(y, y_pred)


@data_exporter
def export_data(df: DataFrame) -> None:
    X_train, X_test, y_train, y_test = build_training_and_test_set(df)
    model = train_model(X_train, y_train)

    score = score_model(model, X_test, y_test)
    print(f'Accuracy: {score}')

    cwd = os.getcwd()
    filename = f'{cwd}/finalized_model.lib'
    print(f'Saving model to {filename}')
    pickle.dump(model, open(filename, 'wb'))

    print(f'Saving training and test set')
    X_train.to_csv(f'{cwd}/X_train')
    X_test.to_csv(f'{cwd}/X_test')
    y_train.to_csv(f'{cwd}/y_train')
    y_test.to_csv(f'{cwd}/y_test')
```

<img
  alt="train model"
  src="train-model.gif"
/>

## 7. Run pipeline

We can now run the entire pipeline end-to-end. In your terminal, execute the following command:

<b>Docker</b>
```bash
./scripts/run.sh demo_project titanic_survivors
```

<b>pip</b>
```bash
mage run demo_project titanic_survivors
```

You can also run the pipeline from the UI. Click on the <b>Execute pipeline </b> from right bottom panel.

![Screenshot 2022-07-24 at 12 51 44 PM](https://user-images.githubusercontent.com/5618143/180636819-b5b66dc0-6f7d-40b5-8085-3e4cae349a27.png)


Your output should look something like this:

```text
Executing data_loader block: load_dataset...DONE
Executing transformer block: extract_and_impute_numbers...DONE
Executing data_exporter block: train_model...Accuracy: 0.757847533632287
Saving model to /home/src/finalized_model.lib
Saving training and test set
DONE
```

---

## Congratulations!

You’ve successfully built an ML pipeline that consists of
modular code blocks and is reproducible in any environment.

If you have more questions or ideas, please
live chat with us in
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
