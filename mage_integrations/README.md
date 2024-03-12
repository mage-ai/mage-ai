## Set up

1. Pull the `mage-ai` repository and `cd` into it.
2. Run Mage in a development Docker container using `./scripts/dev.sh [PROJECT NAME]`. This starts Mage and allows us to make changes in realtime. See [this page](https://docs.mage.ai/community/contributing) for more details.
3. Open another terminal and run:
    ```bash
    docker exec -it mage-ai-server-1 bash
    ```
    This will open a shell in the Docker container and allow us to interact with the integrations.
4. Uninstall the existing `mage-integrations` package using `pip`:
    ```bash
    pip3 uninstall -y mage-integrations
    ```
5. `cd` into `mage_integrations/`.
   ```bash
   cd mage_integrations/
   ```

## Testing sync locally

Run

```bash 
touch ./mage_integrations/TEST_CATALOG.json &&
touch ./mage_integrations/TEST_CONFIG_S.json &&
touch ./mage_integrations/TEST_CONFIG_D.json &&
touch ./mage_integrations/TEST_STATE.json &&
touch ./mage_integrations/TEST_OUTPUT &&
echo "{}" >> ./mage_integrations/TEST_STATE.json
```

To create the following files:

```bash
TEST_CATALOG.json
TEST_CONFIG_S.json
TEST_CONFIG_D.json
TEST_STATE.json
TEST_OUTPUT
```

We'll be using these files to test the integration.

### Set up source config

Populate `TEST_CONFIG_S.json` with a sample configuration, this is found at:

`mage_integrations/mage_integrations/sources/[INTEGRATION]/templates/config.json`

For the GitHub integration, this is:

```json
{
  "access_token": "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
  "repository": "mage-ai/mage-ai",
  "start_date": "2021-01-01T00:00:00Z",
  "request_timeout": 300,
  "base_url": "https://api.github.com"
}
```

### Discover streams

Run the following command to discover streams for your source:

```bash
python3 mage_integrations/sources/[INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --discover \
  --discover_streams
```

Now, you should see a list of streams that you can sync from the source. Grab a few of interest!

The output from GitHub looks like this:

```json
[
    {
        "stream": "commits",
        "tap_stream_id": "commits"
    },
    {
        "stream": "comments",
        "tap_stream_id": "comments"
    },
    ...
]
```

### Get schema for streams

Now test grabbing schemas for a few streams above and output the data to our catalog file. This should be passed, in string format, as a list of strings, e.g. `'["commits", "comments"]'`.

```bash
python3 mage_integrations/sources/[INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --discover \
  --selected_streams SCHEMAS > mage_integrations/TEST_CATALOG.json
```

For example, for the GitHub source:

```bash
python3 mage_integrations/sources/github/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --discover \
  --selected_streams '["commits"]' > mage_integrations/TEST_CATALOG.json
```

Your catalog will now contain the schemas for the streams you selected. We need to enable a schema now— this is usually handled by the Mage UI, but we can do it ourselves.

For each stream in `TEST_CATALOG.json`, find the nested `metadata` key and add a `"selected": true`:

```json
...
"stream": "commits",
"metadata": [
  {
    "breadcrumb": [],
    "metadata": {
      "table-key-properties": [
        "sha"
      ],
      "forced-replication-method": "INCREMENTAL",
      "valid-replication-keys": "updated_at",
      "inclusion": "available",
      "selected": true
    }
  },
...
```

Additonally, also add to add ```"selected": true``` to at least one column in each stream for SQL sources.

```json
{
  "stream": "commits",
  "tap_stream_id": "commits",
  "selected": true
}
```

## Test stream execution and save to output file

Finally! It's time to test our stream execution. Run the following command to execute the stream and save the output to a file:

```bash
python3 mage_integrations/sources/[INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --catalog mage_integrations/TEST_CATALOG.json \
  --state mage_integrations/TEST_STATE.json > mage_integrations/TEST_OUTPUT
```

Check `TEST_OUTPUT` to see real-time results!

## Test writing your output to a database

Now, let's test writing our output to a destination. Populate the destination config file with a sample configuration in a similar manner to the source config, then run:

```bash
python3 mage_integrations/destinations/postgresql/__init__.py \
  --config mage_integrations/TEST_CONFIG_D.json \
  --state mage_integrations/TEST_STATE.json \
  --input_file_path mage_integrations/TEST_OUTPUT \
  --debug
```

To write `TEST_OUTPUT` to your destination. Note: you will need a sample data source to write to.

## Source to destination end-to-end

This will test pulling from the target and writing to the destination:

```bash
python3 mage_integrations/sources/[SOURCE_INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --catalog mage_integrations/TEST_CATALOG.json \
  --state mage_integrations/TEST_STATE.json | python3 mage_integrations/destinations/[TARGET_INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_D.json \
  --state mage_integrations/TEST_STATE.json \
  --debug
```

For example, an end-to-end GitHub to Postgres data integration:

```bash
python3 mage_integrations/sources/github/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --catalog mage_integrations/TEST_CATALOG.json \
  --state mage_integrations/TEST_STATE.json | python3 mage_integrations/destinations/postgres/__init__.py \
  --config mage_integrations/TEST_CONFIG_D.json \
  --state mage_integrations/TEST_STATE.json \
  --debug
```

## Test in the Mage UI

Once you've tested your tap in the terminal, it's time to test it in Mage. 

First, return to your terminal and run `pip install -U mage_integrations/` in your `mage_integrations` directory. That will build our _new_ `mage-integrations` package and make the changes you made available to the UI.

Open up Mage (`localhost:3000` in dev) and create a new data integration pipeline:

<div align="center">
<img src="docs/media/adapt-existing-source/new-pipeline.png" width="50%"/>
</div>

Select your source from the list:

<div align="center">
<img src="docs/media/adapt-existing-source/select-source.png" width="50%"/>
</div>

Now, perform the following in the Mage UI to verify a working source:

- Test the connection
- View and select streams
- Sync one stream to a destination
  - If you're adding a tap in a PR, be sure to add logs of the source and show data in the destination table to the PR description.
- If incremental sync is supported, please also test it: check if the state is updated and fetched correctly.

## Count records

You can count the number of records in your stream with the following command:

```bash
python3 mage_integrations/sources/[INTEGRATION]/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --catalog mage_integrations/TEST_CATALOG.json \
  --state mage_integrations/TEST_STATE.json \
  --count_records \
  --selected_streams '["your_stream"]'
```

### Perform a sample query

Use this template to perform a sample query of your data:

```bash
python3 mage_integrations/sources/freshdesk/__init__.py \
  --config mage_integrations/TEST_CONFIG_S.json \
  --catalog mage_integrations/TEST_CATALOG.json \
  --query_json '{"_end_date": null, "_execution_date": "2022-11-17T21:05:53.341319", "_execution_partition": "444/20221117T210443", "_start_date": null, "_limit": 1000, "_offset": 0}' \
  --state mage_integrations/TEST_STATE.json
```
