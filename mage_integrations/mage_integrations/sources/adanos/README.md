# Adanos

This source adapts the existing [tap-adanos](https://github.com/adanos-software/tap-adanos)
Singer CLI. It does not bundle the tap or install its dependencies into Mage.

## Installation

Install the tap in a separate Python 3.10+ virtual environment in the Mage
worker image, using the same path on every worker. Mage pins an older Singer SDK
and Requests than the tap, so do not install the tap into Mage's environment.
This example pins the tested PyPI release:

```bash
python3.12 -m venv /opt/adanos
/opt/adanos/bin/pip install 'tap-adanos==0.1.0'
```

## Configuration

Select **Adanos** in a data integration pipeline. Set `tap_path` to the absolute
path of the installed `tap-adanos` executable. `tap_config` is passed to the tap
unchanged; the template uses the current `https://api.adanos.com` API.

Create your own [Adanos API key](https://adanos.com/register), save it as the Mage
secret `adanos_api_key`, and use `{{ mage_secret_var('adanos_api_key') }}` for
`tap_config.api_key`. Never commit a real key or put it in command arguments.
The adapter stores config and output in a private temporary directory and
deletes both after each invocation. Ensure the worker has sufficient scratch disk.

| Tap setting | Meaning |
| --- | --- |
| `asset_type` | `stock` or `crypto` (Reddit only for crypto). |
| `stock_source` | `reddit`, `x`, `news`, or `polymarket`; ignored for crypto. |
| `symbols` | Nonempty list of symbols for detail and comparison streams. |
| `start_date`, `end_date` | Inclusive UTC dates, `YYYY-MM-DD`, sent as `from` and `to`, not `days`. Set both explicitly for a stable window. |
| `page_size` | Trending page size, 1 through 100; default 100. |

Dates are fixed configuration, not automatically taken from Mage runtime
variables. Update the template's dates before running. Select only needed streams
to control quota use. Discovery makes no API requests. **Test connection** fetches
one market-sentiment snapshot and consumes an API request; sample data runs the
entire selected stream, including all trending pages or configured symbols.

## Streams and limitations

All four streams use `FULL_TABLE` replication:

- `asset_sentiment`: one detail snapshot per configured symbol.
- `trending_assets`: paginated trending snapshots.
- `asset_comparison`: comparison rows, in batches of at most ten symbols.
- `market_sentiment`: one source-wide snapshot.

Records retain the tap's `asset_type`, `source`, `period_from`, and `period_to`.
There is no `observed_at`, incremental cursor, raw-mention stream, or point-in-time
historical guarantee. Repeating a date window can return revised aggregates.
The tap's asset keys omit `asset_type`; do not mix stock and crypto into the same
destination table. Market keys include `asset_type`.

## Local tests

Run with Mage's source dependencies installed and an isolated tap environment:

```bash
PYTHONPATH=mage_integrations TAP_ADANOS_PATH=/opt/adanos/bin/tap-adanos \
  python -m unittest mage_integrations.tests.sources.adanos.test_adanos
```

The tap tests use a loopback HTTP server and a synthetic key, never the public API.
Without `TAP_ADANOS_PATH`, the real-tap cases are skipped.

Use the customer's own key on every plan. Source access, history and quotas remain
subject to that account's current entitlements; this integration grants no extra
access. Raw mentions are not supported. See the [current API contract](https://api.adanos.com/openapi.json)
and your account for limits.

Each tap invocation has a five-minute timeout. Output is buffered on disk until
the tap succeeds, so a failed invocation emits no partial batch to Mage. API errors
and exhausted retries fail the run; the adapter reports an exit code without
forwarding potentially sensitive tap diagnostics. It does not resume partial
extractions. Reduce the symbol count/window if a stream exceeds the timeout.
