# Add a new source

In this guide, we’ll build a sample source for Titanic.
When you’re building your own source, you can swap out the Titanic
name for the real name of your new source.

1. Create a directory for the new source
1. Define custom source class
1. Add main function
1. Test your source
1. Add your source to the UI (optional)

<br />

## 1. Create a directory for the new source

In the `mage_integrations/sources/` directory, add a new directory named after your source.
Use snake case and lowercase for your directory name: `mage_integrations/sources/titanic/`.

In this new directory, create the following subdirectories and files:

- `mage_integrations/sources/titanic/schemas/passengers.json`
- `mage_integrations/sources/titanic/templates/config.json`
- `mage_integrations/sources/titanic/__init__.py`
- `mage_integrations/sources/titanic/README.md`

The directory structure should look like this:

```
mage_integrations/
|   sources/
|   |   titanic/
|   |   |   schemas/
|   |   |   |   passengers.json
|   |   |   templates/
|   |   |   |   config.json
|   |   |   __init__.py
|   |   |   README.md
```

### Schemas folder

This folder contains all the known schemas from your source.

For sources that have dynamic schemas (e.g. database tables from MySQL),
this folder may be empty since the schema is dependent on the individual’s source data.

The JSON format of these schema files follows the
[Singer spec](https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#schemas).

#### Naming convention

Use the plural name of the object you’re referencing.
This plural name will be displayed to the individual who is setting up a synchronization using this source.

#### Examples

[`mage_integrations/sources/titanic/schemas/passengers.json`](../../../../mage_integrations/sources/titanic/schemas/passengers.json)

```json
{
  "properties": {
    "Survived": {
      "type": [
        "null",
        "integer"
      ]
    },
    "Name": {
      "type": [
        "null",
        "string"
      ]
    }
  },
  "type": [
    "null",
    "object"
  ]
}

```

### Templates folder

This folder contains a sample configuration JSON file that’s
displayed to the user when they are setting up a synchronization using this source.

The `config.json` file contains keys and values that are used to configure the
behavior of the source as well as credentials to authenticate requests to the source.

#### Naming convention

You must use the exact filename `config.json`.

#### Examples

[`mage_integrations/sources/titanic/templates/config.json`](../../../../mage_integrations/sources/titanic/templates/config.json)

```json
{
  "api_key": "",
  "secret_key": ""
}
```

### `__init__.py`

This is where majority of the source logic will exist.

#### Examples

[`mage_integrations/sources/titanic/__init__.py`](../../../../mage_integrations/sources/titanic/__init__.py)

### `README.md`

Document how to configure and use your source in the `README.md` file.

<br />

## 2. Define custom source class

In the `mage_integrations/sources/titanic/__init__.py`,
create a new class named after your source and subclass the
[base source class](../../../../mage_integrations/sources/base.py).

```python
from mage_integrations.sources.base import Source


class Titanic(Source):
    pass
```

### Override the `load_data` method

The base `Source` class has an instance method called `load_data`. Here is the interface:

```python
def load_data(
    self,
    bookmarks: Dict = None,
    query: Dict = {},
    start_date: datetime = None,
    **kwargs,
) -> Generator[List[Dict], None, None]:
    yield []
```

Override this method to contain the logic for fetching data that is specific to your source.

For example, here is the code for the `Titanic` source’s `load_data` method:

```python
def load_data(
    self,
    **kwargs,
) -> Generator[List[Dict], None, None]:
    url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/titanic_survival.csv'
    text = requests.get(url).text

    rows = []
    lines = text.rstrip().split('\n')
    columns = lines[0].split(',')

    for line in lines[1:]:
        values = line.split(',')
        rows.append({col: values[idx] for idx, col in enumerate(columns)})

    yield rows
```

#### Available values in the `query` keyword argument

There is a keyword argument named `query` in the `load_data` method that is a dictionary.

When Mage runs a source, the following keys and values are automatically available on each run:

| Key | Description | Sample value |
| --- | --- | --- |
| `_execution_date` | The date and time (in ISO format) of when the pipeline started running. | `2022-10-21T17:24:49.443559` |
| `_execution_partition` | An automatically formatted partition of the pipeline run using the execution date. | `20221021T172557` (e.g. format `%Y%m%dT%H%M%S`) |
| `_start_date` | You can define this variable as a [runtime variable](../../../production/runtime_variables.md) in your pipeline or it’ll be automatically filled in using the date and time your pipeline runs minus 1 hour, day, week, etc (based on your schedule’s interval). | `2022-10-01T00:00:00.000000` |
| `_end_date` | You can define this variable as a [runtime variable](../../../production/runtime_variables.md) in your pipeline or it’ll be automatically filled in using the date and time your pipeline runs. | `2022-10-02T00:00:00.000000` |

<br />

## 3. Add main function

In the file [`mage_integrations/sources/titanic/__init__.py`](../../../../mage_integrations/sources/titanic/__init__.py)
where your custom source class is defined, import this at the top of the file:

```python
from mage_integrations.sources.base import Source, main
```

Then, add the following code at the bottom of the file (outside of the class definition):

```python
if __name__ == '__main__':
    main(Titanic)
```

Your final file should look like this:

```python
from mage_integrations.sources.base import Source, main
from typing import Dict, List
import csv
import requests


class Titanic(Source):
    def load_data(
        self,
        **kwargs,
    ) -> List[Dict]:
        url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/titanic_survival.csv'
        text = requests.get(url).text

        rows = []
        lines = text.rstrip().split('\n')
        columns = lines[0].split(',')

        for line in lines[1:]:
            values = line.split(',')
            rows.append({col: values[idx] for idx, col in enumerate(columns)})

        return rows


if __name__ == '__main__':
    main(Titanic)
```

<br />

## 4. Test your source

1. Open a terminal and change directory into the `mage_integrations/` folder:
    ```bash
    cd mage_integrations
    ```
1. Create a sample file of the `config.json` template with a fake `api_key` and `secret_key`:
    ```bash
    echo '{"api_key": 123, "secret_key": 456}' > TEST_CONFIG.json
    ```
1. Create an empty state file (this is used for bookmarking incremental synchronizations):
    ```bash
    echo '{"bookmarks": {}}' > TEST_STATE.json
    ```
1. We’ll create a `catalog.json` file that contains the stream and schema you want to synchronize.
    ```bash
    python3 mage_integrations/sources/titanic/__init__.py --config TEST_CONFIG.json --discover > TEST_CATALOG.json
    ```
1. Open the `TEST_CATALOG.json` file that was just created.
    1. Under the `streams` key, in the 1st object in the `streams` array, find the key `metadata`.
    1. In that `metadata` array of objects, locate the object where its key
    named `breadcrumb` is equal to an empty array (e.g. `[]`);
    this is usually the 1st object in the `metadata` array.
    1. In that object, there is another key named `metadata`.
    In that object, there is a key called `selected`. Set that value to `true`.
    1. The resulting `TEST_CATALOG.json` should look something like this:
    ```json
    {
      "streams": [
        {
          "tap_stream_id": "passengers",
          "replication_key": "",
          "replication_method": "FULL_TABLE",
          "key_properties": [],
          "schema": {},
          "stream": "passengers",
          "metadata": [
            {
              "breadcrumb": [],
              "metadata": {
                "table-key-properties": [],
                "forced-replication-method": "FULL_TABLE",
                "valid-replication-keys": [],
                "inclusion": "available",
                "schema-name": "passengers",
                "selected": true
              }
            }
          ]
        }
      ]
    }
    ```
1. Open the `TEST_CATALOG.json` file that was just created.
    1. Under the `streams` key, in the 1st object in the `streams` array, find the key `metadata`.
    1. Go through each object in the `metadata` array where
    the value of the `breadcrumb` key is not an empty array (e.g. `[]`).
    1. For those objects, there is another key named `metadata`.
    1. Add a key in the `metadata` object named `selected` and set its value to `true`.
    1. The resulting `TEST_CATALOG.json` should look something like this:
    ```json
    {
      "streams": [
        {
          "tap_stream_id": "passengers",
          "replication_key": "",
          "replication_method": "FULL_TABLE",
          "key_properties": [],
          "schema": {},
          "stream": "passengers",
          "metadata": [
            {
              "breadcrumb": [
                "properties",
                "PassengerId"
              ],
              "metadata": {
                "selected": true,
                "inclusion": "available"
              }
            },
            {
              "breadcrumb": [
                "properties",
                "Survived"
              ],
              "metadata": {
                "selected": true,
                "inclusion": "available"
              }
            },
            {
              "breadcrumb": [
                "properties",
                "Pclass"
              ],
              "metadata": {
                "selected": true,
                "inclusion": "available"
              }
            }
          ]
        }
      ]
    }
1. Run a sync:
    ```bash
    python3 mage_integrations/sources/titanic/__init__.py --config TEST_CONFIG.json --state TEST_STATE.json --catalog TEST_CATALOG.json
    ```

You should see the following output in your terminal:

```bash
INFO [2022-10-21T00:50:20.420130] {"caller": "Titanic", "level": "INFO", "message": "Synced stream started.", "tags": {"stream": "passengers"}, "timestamp": 1666313420, "uuid": "deb26a173b3b4fdb887a26000e8a425c", "type": "LOG"}
INFO [2022-10-21T00:50:20.420292] {"caller": "Titanic", "level": "INFO", "message": "Syncing stream passengers.", "tags": {}, "timestamp": 1666313420, "uuid": "ad5742afe83041ed9d263feebc5e19c4", "type": "LOG"}
{"type": "SCHEMA", "stream": "passengers", "schema": {"properties": {"PassengerId": {"type": ["null", "integer"]}, "Survived": {"type": ["null", "integer"]}, "Pclass": {"type": ["null", "integer"]}}, "type": ["null", "object"]}, "key_properties": [], "replication_method": "INCREMENTAL"}
{"type": "RECORD", "stream": "passengers", "record": {"PassengerId": "1", "Survived": "0", "Pclass": "3"}}
...
{"type": "RECORD", "stream": "passengers", "record": {"PassengerId": "891", "Survived": "0", "Pclass": "3"}}
INFO [2022-10-21T00:50:20.607364] {"caller": "Titanic", "level": "INFO", "message": "Synced stream completed.", "tags": {"stream": "passengers", "records": 891}, "timestamp": 1666313420, "uuid": "3e464428eabd4a29893e5f826d82a8aa", "type": "LOG"}
```

<br />

## 5. Add your source to the UI (optional)

If you want your source to be selectable in the Mage UI when creating a data integration pipeline,
open the [`mage_ai/data_integrations/sources/constants.py`](mage_ai/data_integrations/sources/constants.py)
file and add your source as a dictionary to the constant variable named `SOURCES`.

Here is an example:

```python
SOURCES = [
    dict(name='Titanic'),
]
```

If your name is different than the source folder name you created above
(e.g. `mage_integrations/sources/titanic/`), then add a key named `uuid` to the dictionary with the
value that matches your custom source’s directory:

```python
SOURCES = [
    dict(name='Titanic Passengers Data Source', uuid='titanic'),
]
```

<br />

## All done

You’ve successfully added a new source. Now every developer can benefit from the awesome code you wrote.

If you have any questions, thoughts, feedback, or need help, please chat with us on Slack for instant conversations:

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

<br />
