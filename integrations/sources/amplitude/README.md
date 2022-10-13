python t_source_amplitude.py --config sources/amplitude/config.json --discover > sources/amplitude/catalog.json

python t_source_amplitude.py --config sources/amplitude/config.json --catalog sources/amplitude/catalog.json  --state sources/amplitude/state.json


### Create the configuration file

Create a config file containing the stripe credentials, e.g.:

```json
{
  "client_secret": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxx",
  "account_id": "acct_xxxxxxxxxxxxxxxx",
  "start_date": "2017-01-01T00:00:00Z",
  "request_timeout": 300,
  "lookback_window": 600,
  "event_date_window_size": 7,
  "date_window_size": 30
}
```

### Discovery mode

The tap can be invoked in discovery mode to find the available stripe entities.

```bash
$ tap-stripe --config config.json --discover

```

A discovered catalog is output, with a JSON-schema description of each table. A
source table directly corresponds to a Singer stream.

```json
{
  "streams": [
    {
      "stream": "charges",
      "tap_stream_id": "charges",
      "schema": {
        "type": [
          "null",
          "object"
        ],
        "properties":{

        }
      }
    }
  ]
}
```

### Field selection

In sync mode, `tap-stripe` consumes the catalog and looks for streams that have been
marked as _selected_ in their associated metadata entries.

Redirect output from the tap's discovery mode to a file so that it can be
modified:

```bash
$ tap-stripe --config config.json --discover > catalog.json
```

Then edit `catalog.json` to make selections. The stream's metadata entry (associated
with `"breadcrumb": []`) gets a top-level `selected` flag, as does its columns' metadata
entries.

```diff
[
  {
    "breadcrumb": [],
    "metadata": {
      "valid-replication-keys": [
        "created"
      ],
      "table-key-properties": [
        "id"
      ],
      "forced-replication-method": "INCREMENTAL",
+      "selected": "true"
    }
  },
]
```

### Sync mode

With a `catalog.json` that describes field and table selections, the tap can be invoked in sync mode:

```bash
$ tap-stripe --config config.json --catalog catalog.json
```

Messages are written to standard output following the Singer specification. The
resultant stream of JSON data can be consumed by a Singer target.

---

Copyright &copy; 2018 Stitch
