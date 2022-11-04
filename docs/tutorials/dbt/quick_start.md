# Set up DBT models & orchestrate DBT runs

<img alt="DBT" src="https://www.getdbt.com/ui/img/social/facebook.png" width="500" />

1. [Set up new Mage project](#1-set-up-new-mage-project)
1. [Set up DBT project](#2-set-up-dbt-project)
1. [Create standard (batch) pipeline](#3-create-standard-pipeline)
1. [Create DBT profile for database connections](#4-create-dbt-profile-for-database-connections)
1. [Add data loader block to pipeline](#5-add-data-loader-block-to-pipeline)
1. [Add DBT model block to pipeline](#6-add-dbt-model-block-to-pipeline)
1. [Add test for DBT model](#7-add-test-for-dbt-model)
1. [Execute pipeline end-to-end](#8-execute-pipeline-end-to-end)

<br />

## 1. Set up new Mage project

Read the [setup guide](../quick_start/setup.md)
to initialize a new project and start the Mage tool locally.

For the rest of this tutorial, we’ll use the project name `demo_project`.

<br />

## 2. Set up DBT project

### Install DBT

1. Open Mage and go to the terminal page: http://localhost:6789/terminal
1. Add `dbt-postgres` to your project’s dependencies file (`requirements.txt`)
by typing the following into the terminal in your browser:
    ```bash
    echo dbt-postgres > demo_project/requirements.txt
    ```
1. Install your project’s dependencies using `pip` by typing the following:
    ```bash
    pip install -r demo_project/requirements.txt
    ```

    For more information on installing DBT, read their [documentation](https://docs.getdbt.com/docs/get-started/pip-install).

### Create DBT project

1. Open Mage and go to the terminal page: http://localhost:6789/terminal
1. Initiate your DBT project using the `init` command (for this tutorial, we’ll use the DBT project name `demo`):
    ```bash
    cd demo_project/dbt
    dbt init demo
    touch demo/profiles.yml
    ```

    For more information on creating a DBT project,
    read their [documentation](https://docs.getdbt.com/docs/get-started/getting-started-dbt-core#create-a-project).

<br />

## 3. Create standard pipeline

1. Go to the [Mage dashboard](http://localhost:6789/) and click the button <b>`+ New pipeline`</b>
and select the option labeled `Standard (batch)`.
1. Near the top of the page, click the pipeline name and change it to `dbt demo pipeline`.

<br />

## 4. Create DBT profile for database connections

1. On the left side of the page in the file browser, expand the folder `demo_project/dbt/demo/`.
1. Click the file named `profiles.yml`.
1. Paste the following credentials in that file:
    ```yaml
    demo:
      target: dev
      outputs:
        dev:
          dbname: mage/demo2
          host: db.bit.io
          password: v2_3upzD_eMSdiu5AMjgzSbi3K7KTAuE
          port: 5432
          schema: dbt_demo
          type: postgres
          user: mage
    ```
1. Save the `profiles.yml` file by pressing `Command (⌘)` + `S`.
1. Close the file by pressing the <b>`X`</b> button on the right side of the file name `dbt/demo/profiles.yml`.

<br />

## 5. Add data loader block to pipeline

1. Click the <b>`+ Data loader`</b> button, select `Python`, then click `API`.
1. At the top of the block, on the right of `DATA LOADER`, click the name of the block.
1. Change the name to `load data`.
1. Paste the following code in that block:
    ```python
    import io
    import pandas as pd
    import requests
    from pandas import DataFrame


    @data_loader
    def load_data_from_api(**kwargs) -> DataFrame:
        url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/restaurant_user_transactions.csv'

        response = requests.get(url)
        return pd.read_csv(io.StringIO(response.text), sep=',')
    ```

<br />

## 6. Add DBT model block to pipeline

1. Under the data loader block you just added, click the button <b>`DBT model`</b>,
then click the option `Single model`.
1. In the file browser that pops up, click the file named `my_second_dbt_model.sql`
under the folders `demo/models/example/`.
    1. This will add 2 DBT blocks to your pipeline: 1 for the DBT model named `my_first_dbt_model`
    and the 2nd for the DBT model named `my_second_dbt_model`.
    1. The model named `my_first_dbt_model` was added to the pipeline because `my_second_dbt_model`
    references it.

![](https://github.com/mage-ai/assets/blob/main/dbt/add-dbt-model.gif?raw=true)

### 6a. Edit DBT model `my_first_dbt_model`

1. In the DBT block named `my_first_dbt_model`,
next to the label `DBT profile target` at the top is an input field, enter `dev`.
1. Paste the following SQL into the DBT model named `my_first_dbt_model`:
    ```sql
    WITH source_data AS (
        SELECT 1 AS id
        UNION ALL
        SELECT 2 AS id
    )

    SELECT *
    FROM source_data
    ```
1. Run the DBT model block by pressing the play button on the top right of the block or
by pressing `Command` + `Enter`.
1. You should see a preview of the query results.


### 6b. Edit DBT model `my_second_dbt_model`

1. In the DBT block named `my_second_dbt_model`,
next to the label `DBT profile target` at the top is an input field, enter `dev`.
1. Paste the following SQL into the DBT model named `my_second_dbt_model`:
    ```sql
    SELECT
        a.*
        , b.*
    FROM {{ ref('my_first_dbt_model') }} AS a

    LEFT JOIN {{ source('mage_demo', 'dbt_demo_pipeline_load_data') }} AS b
    ON 1 = 1

    WHERE a.id = 1
    ```

    > [<b>DBT sources</b>](https://docs.getdbt.com/docs/build/sources)
    >
    > When a DBT model depends on an upstream block that isn’t a DBT model,
    > a source for that block is automatically added to the
    > `demo_project/dbt/demo/models/example/mage_sources.yml` file.
    >
    > Read more about DBT sources in their [documentation](https://docs.getdbt.com/docs/build/sources).

1. Run the DBT model block by pressing the play button on the top right of the block or
by pressing `Command` + `Enter`.
1. You should see a preview of the query results.

<br />

## 7. Add test for DBT model

1. On the right side of the screen, click the tab labeled <b>`Terminal`</b>.
1. Create a new DBT test file by running the following command:
    ```bash
    touch demo_project/dbt/demo/tests/test_my_second_dbt_model.sql
    ```
1. On the left side of the page in the file browser,
expand the folder `demo_project/dbt/demo/tests/`
and click the file named `test_my_second_dbt_model.sql`. If you don’t see it, refresh the page.
1. Paste the following SQL in the file:
    ```sql
    SELECT id
    FROM {{ ref('my_second_dbt_model') }}
    GROUP BY id
    HAVING (id = 0)
    ```
1. Read more about DBT tests in their [documentation](https://docs.getdbt.com/docs/build/tests).

<br />

## 8. Execute pipeline end-to-end

1. Click the name of the pipeline in the header breadcrumbs to go back to the detail page.
1. Create a new trigger (you can use any interval you want for this tutorial).
For more details, follow these [steps](../../features/orchestration/README.md#create-trigger).
1. After your trigger is created, click the <b>`Start trigger`</b> button at the top of the page.
1. The pipeline will eventually fail because a DBT test failed.
This means everything is working as expected.
1. Open the file `demo_project/dbt/demo/models/example/schema.yml`
and remove the tests named `unique` under both models. Your file should look like this:
    ```yaml
    version: 2

    models:
      - name: my_first_dbt_model
        description: "A starter dbt model"
        columns:
          - name: id
            description: "The primary key for this table"
            tests:
              - not_null

      - name: my_second_dbt_model
        description: "A starter dbt model"
        columns:
          - name: id
            description: "The primary key for this table"
            tests:
              - not_null
    ```
1. Click on the <b>`Failed`</b> button next to the pipeline run and click <b>`Retry run`</b>.
It should complete running successfully after a few minutes.

Congratulations! You’ve created a data pipeline that orchestrates your DBT models.

<br />

## Support

If you get stuck, run into problems, or just want someone to walk you through these steps, please join our
[<img alt="Slack" height="20" src="https://user-images.githubusercontent.com/78053898/198755054-03d47bfc-18b6-45a5-9593-7b496eb927f3.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
and someone will help you ASAP.

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)


<br />
