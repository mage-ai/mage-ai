# mage-omd-lineage

Publish **table- and column-level lineage** from Mage.ai pipelines into
**OpenMetadata**, configured per pipeline, from inside Mage's Python environment.

The connector reads a Mage project the same way Mage does (`pipelines/<uuid>/metadata.yaml`
plus block sources), analyses SQL and Python blocks, resolves every physical table against
OpenMetadata, and writes native OpenMetadata lineage edges at the end of a successful run.

Lineage **never fails a pipeline**: every Mage-facing entry point returns `None` and logs
instead of raising. Failures are reported in the coverage report, the spool, and the CLI
exit code.

---

## Principles

1. **OpenMetadata is the only catalog.** The whole database is ingested by OpenMetadata
   metadata/profiler/classification agents. The connector never introspects the database
   and never creates tables or columns. It only looks up the tables a pipeline references.
2. **Physical tables only, virtual hops collapsed.** Every published edge runs between two
   physical tables, including Mage's auto-created staging tables. In-memory DataFrame hops
   are collapsed through their upstream physical tables.
3. **End of pipeline only.** Lineage is emitted after every block succeeds, so the
   source/target/intermediate tables are guaranteed to exist.
4. **Fail open, report loudly.** Unresolvable edges are skipped (partial publication),
   spooled to disk for retry, and listed with exact remediation.

---

## Install

```bash
python3 -m pip install -e .
```

Requires Python 3.10+, `PyYAML`, `requests`, `sqlglot`. The Mage adapter is installed into
the Mage project's own environment (for example via the project `requirements.txt`), not
into Mage core.

Add to the Mage project's `requirements.txt`:

```
mage-omd-lineage @ git+https://github.com/<your-fork>/mage-omd-lineage.git@v0.1.0
```

---

## Configure

Create `omd_lineage.yaml` at the Mage project root (repository root, next to
`metadata.yaml`):

```yaml
openmetadata:
  host: ${OMD_HOST:-http://localhost:8585}
  token: ${OMD_TOKEN}
  pipeline_service: mage          # a CustomPipeline service; created if absent
  pipeline_name_template: "{project}__{pipeline}"
  custom_properties: auto         # auto-register extension.lineage once; off = local state only
  catalog:
    mode: existing_only           # never create tables/columns
    lookup:
      fields: [columns]
  emit:
    batch_size: 50
    time_budget_ms: 5000          # never hold a pipeline run for longer than this
  coverage:
    on_missing: fail              # fail the lineage job, not the pipeline
    on_column_missing: fail
    on_unmodelled_block: warn
    on_unsupported: fail
    emit: resolvable              # resolvable | all_or_nothing
    report_path: mage_data/demo_project/omd_lineage/coverage.json
  unresolved:
    spool: true
    retry_after: 6h

profiles:
  default:
    service: warehouse_demo       # OpenMetadata database service name
    driver: postgres
    database: analytics           # database segment of the OMD FQN
    default_schema: public
    case: lower                   # preserve | lower | upper
    # fqn: "{service}.{database}.{schema}.{table}"   # override per platform

pipelines:
  demo_lineage:
    enabled: true
    trigger_adapter: both         # pipeline_callback | sentinel | both
    trigger:
      modes: [on_run, on_change, schedule]
      schedule:
        every: 6h
      emit_on_unchanged: status_only

    # Python blocks opt in with an explicit column contract.
    blocks:
      load_orders:
        contract:
          inputs: [raw.orders]
          outputs: [block:load_orders]
          columns:
            - to: id
              from: [raw.orders.id]
      revenue_export:
        contract:
          inputs: [mart.customer_revenue]
          outputs: [mart.customer_revenue_export]
          columns:
            - to: revenue
              from: [mart.customer_revenue.revenue]
      customer_revenue_dbt:
        dbt_model: customer_revenue            # or match by file_path / block name
        dbt_manifest: dbt_demo/target/manifest.json
```

`${ENV}` and `${ENV:-default}` are expanded at load time. Enabled pipelines are the only
ones looked up in OpenMetadata; everything else is ignored.

### Dataset references

| Form | Meaning |
| --- | --- |
| `schema.table` | database filled from the profile |
| `database.schema.table` | used as written |
| `service.database.schema.table` | `dataset_registry` override only |
| `block:<uuid>` | another block's output (in-memory) |

`dataset_registry` maps a written name to a canonical OpenMetadata FQN when case or naming
conventions make automatic resolution ambiguous.

---

## Triggering lineage

### OSS: sentinel block

Add a final `custom` block whose only job is to emit lineage, downstream of every terminal
block:

```python
# custom/emit_lineage.py
@custom
def emit_lineage(**kwargs):
    from mage_omd_lineage.adapters import lineage_emit

    lineage_emit(**kwargs)
```

This is a single terminal node, so there is no multi-terminal race. It re-reads the whole
pipeline and publishes it, including Mage's auto-created staging tables.

### Mage Pro: pipeline callback

Configure a pipeline-level callback (Mage ≥ 0.8.61) that calls `lineage_emit(**kwargs)`.
Use `trigger_adapter: pipeline_callback` in the pipeline config.

### Scheduled and one-time refresh

```bash
# Preview only (no writes)
mage-omd-lineage plan   --project . --pipeline demo_lineage

# Publish, ignoring the fingerprint
mage-omd-lineage apply  --project . --pipeline demo_lineage --force --yes --non-interactive

# Refresh only pipelines whose schedule/change fingerprint says they are due
mage-omd-lineage apply  --project . --all --due --yes --non-interactive

# Retry only edges recorded in the spool
mage-omd-lineage apply  --project . --pipeline demo_lineage --only-missing --yes --non-interactive

mage-omd-lineage spool show  --project .
mage-omd-lineage spool flush --project . --pipeline demo_lineage
mage-omd-lineage spool clear --project .
```

State is stored on the OpenMetadata pipeline entity under `extension.lineage`
(fingerprint, last status, last attempt, gaps) with a local fallback in
`mage_data/<project>/omd_lineage/`.

OpenMetadata only accepts `extension` keys registered as custom properties. With
`custom_properties: auto` (the default) the connector probes the `pipeline` type and
registers a string property named `lineage` once, storing the state as JSON text. If the
token cannot edit metadata types, or the property cannot be registered, the connector
skips the extension and uses the local state file instead; lineage itself is unaffected.
Set `custom_properties: off` to never touch the type schema.

The fingerprint covers `metadata.yaml`, block code, contracts, profile mappings and the
connector version, so analyser improvements force a re-emit.

---

## What gets analysed

| Block | Analysis |
| --- | --- |
| SQL (CTAS, INSERT, CTE, joins, subqueries) | `sqlglot`, exact column origins |
| Python block with `contract` | explicit input/output/column mapping |
| Python block without contract | table-level pass-through, reported as `unmodelled_block` |
| dbt | `manifest.json` (compiled SQL + model target); table-level if `compiled_code` is absent |
| chart/markdown/scratchpad/sensor/callback/conditional | ignored |

`SELECT *` is expanded from OpenMetadata column metadata. If the catalog has no columns,
the block is published as table-level only and reported, never guessed.

### dbt

Point the connector at a manifest with `blocks.<uuid>.dbt_manifest`, or let it discover
`<dbt_project_path>/target/manifest.json` (or a manifest whose `project_name` matches
`dbt_project_name`). The block is matched to a model by `dbt_model`, `file_path`, or block
name. The model's `compiled_code` is analysed with the model's real database/schema as the
target, and every `depends_on` node becomes a table-level edge even when macros or
ephemeral models hide it from the compiled SQL. Run `dbt compile` before the pipeline so
the manifest is current.

### Capability gate

A pipeline is analysed only when every database it touches has an OpenMetadata database
service that can ingest it. Run `mage-omd-lineage platforms` for the live map.

| Mage driver | OpenMetadata service | State |
| --- | --- | --- |
| postgres, mysql, mariadb, mssql, oracle, bigquery, snowflake, redshift, clickhouse, trino, presto, druid, pinot, timescale, azuresql | matching service | `supported` |
| spark, databricks | Databricks | `delegated` (use the OpenLineage Spark listener) |
| s3, gcs, file | — | `delegated` (file-level lineage out of scope) |
| duckdb, sqlite, kafka, vector/search stores, APIs | — | `unsupported` |

Whole pipeline skipped when its platform is not `supported`; nothing is published.

---

## Failure semantics

The lineage **job** fails (and reports) while the **Mage pipeline** succeeds.

| Condition | Behaviour |
| --- | --- |
| Table in DB, absent in OpenMetadata | `missing_in_catalog`; edge spooled; remediation: run metadata ingestion, then retry |
| Reference matches more than one table | `ambiguous_reference`; add a `dataset_registry` entry |
| Column missing from an OpenMetadata table | `column_missing`; edge spooled |
| Some edges resolve | resolvable edges published, status `partial` |
| Unsupported platform | whole pipeline skipped, `unsupported_platform` |
| Auth / transport failure | fatal for the lineage job, spooled, pipeline unaffected |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | everything resolved and published (or unchanged/delegated) |
| `1` | partial: resolvable edges published, gaps reported or spooled |
| `2` | fatal: configuration, auth or transport |
| `3` | unsupported platform (lineage cannot exist for that database) |

### Coverage report

`mage_data/<project>/omd_lineage/coverage.json`:

```json
{
  "pipeline": {
    "pipeline": "demo_lineage",
    "status": "ok",
    "referenced_tables": 5,
    "wired_tables": 5,
    "missing_in_catalog": [],
    "ambiguous_references": [],
    "columns_projected": 12,
    "columns_mapped": 12,
    "column_coverage": 1.0,
    "platforms": ["Postgres"]
  },
  "emit": { "edges_written": 4, "columns_written": 12, "spooled": 0 }
}
```

---

## Local end-to-end harness

Everything is under `harness/`.

```bash
# 1. OpenMetadata 1.6.5 from released images (server, ingestion, OpenSearch, Postgres)
./harness/bootstrap_omd.sh

# 2. Demo warehouse with raw/stg/mart tables and seed data
docker compose -f harness/docker-compose.warehouse.yml up -d

# 3. Ingest warehouse metadata into OpenMetadata (UI or CLI)
export OMD_TOKEN=$(./harness/token.sh)
./harness/ingest.sh            # runs ingestion in the compose container
# or, with a host-installed ingestion CLI:
# metadata ingest -c harness/ingest-warehouse.yaml

# 4. Plan, then publish the demo pipeline
./harness/run_demo.sh          # plan only
./harness/run_demo.sh --apply  # write lineage + coverage report
```

Expected result: 4 edges / 12 column mappings, `wired_tables: 5`,
`column_coverage: 1.0` — see `harness/expected_coverage.json`. Re-running without
`--force` reports `unchanged: true` and writes nothing, because `on_change` is enabled
and the fingerprint matches.

OpenMetadata serves the API on `:8585` (UI on the same port); `:8586` is the admin
port. `harness/token.sh` logs in with the default local admin and Base64-encodes the
password as OMD 1.6 requires.

The demo pipeline (`tests/fixtures/demo_project`, pipeline `demo_lineage`) is:

```
raw.orders ─────────────► stg.orders_clean ─┐
                                            ├─► mart.customer_revenue ─► mart.customer_revenue_export
raw.customers ──────────────────────────────┘
```

`duckdb_demo` in the same project is the negative gate test: `plan --all` exits `3`.

### Run the real Mage pipeline (validated end-to-end)

The CLI demo above uses a static fixture. To prove the connector runs *inside Mage*,
use the live project in `harness/mage_demo`:

```bash
export OMD_TOKEN=$(./harness/token.sh)
./harness/start_mage.sh          # Mage at http://localhost:6789, connector installed in-container

# Run the real Mage pipeline (Mage 0.9.79 CLI; UI "Run" is equivalent)
docker exec mage-demo sh -lc \
  'cd /home/src && mage run /home/src/mage_demo demo_lineage'
```

The first run creates `stg.demo_lineage_clean_orders` and
`mart.demo_lineage_customer_revenue`, but the sentinel block reports 4 unresolved edges
and writes nothing because those tables are not yet in OpenMetadata. That is the required
fail-open behaviour. Ingest them, then run the pipeline again:

```bash
./harness/ingest.sh
docker exec mage-demo sh -lc \
  'cd /home/src && mage run /home/src/mage_demo demo_lineage'

docker exec mage-demo cat \
  /home/src/mage_demo/mage_data/mage_demo/omd_lineage/coverage.json
```

The final report is `status: ok`, `wired_tables: 5`, `edges_written: 4`,
`columns_written: 12`, `column_coverage: 1.0`. In OpenMetadata the lineage graph for
`warehouse_demo.analytics.mart.customer_revenue_export` shows the edges attributed to
pipeline `mage.mage_demo__demo_lineage`.

### Manually executed pipeline with fresh tables

For a clean run you can trigger yourself in the Mage UI:

```bash
export OMD_TOKEN=$(./harness/token.sh)
./harness/setup_manual_demo.sh      # creates + ingests the fresh tables into OMD
./harness/start_mage.sh             # reloads Mage so the new pipeline is visible
```

`start_mage.sh` puts `/home/src/connector/src` on `PYTHONPATH` before Mage starts.
Mage's block scheduler forks its workers at startup, so they need the connector on the
process environment rather than relying only on the later editable install.

Open `http://localhost:6789/pipelines/manual_lineage` and click **Run**. Do **not**
run the connector CLI with `--apply` — the sentinel block inside Mage publishes the
lineage.

The pipeline writes:

```text
raw.manual_products ──► stg.manual_products_clean ──┐
raw.manual_sales ───────────────────────────────────┴─► mart.manual_category_revenue
                                                        └─► mart.manual_category_revenue_export
```

After the run, verify:

```bash
docker exec mage-demo cat \
  /home/src/mage_demo/mage_data/mage_demo/omd_lineage/coverage.json
```

The report is overwritten by each run; after `manual_lineage` it should show
`status: ok`, `edges_written: 4`, and no missing tables. In OpenMetadata, the upstream lineage of
`warehouse_demo.analytics.mart.manual_category_revenue_export` will reference
pipeline `mage.mage_demo__manual_lineage`.

No Docker or network needed for the unit tests:

```bash
PYTHONPATH=src python3 -m pytest -q
```

---

## Layout

```
src/mage_omd_lineage/
  cli.py              plan / apply / coverage / fingerprint / platforms / spool
  engine.py           gate -> analyse -> resolve -> report -> emit
  propagate.py        DAG walk, virtual-node collapse, per-write edges
  analyze/sql.py      sqlglot analysis (CTE, CTAS, INSERT, column origins)
  analyze/contracts.py explicit Python-block contracts
  resolve.py          candidate FQNs -> OpenMetadata entities
  emit/emitter.py     pipeline/task upsert, native lineage payloads, spooling
  capabilities.py     Mage driver -> OMD service gate
  platform_capabilities.yaml
  adapters/mage_block.py  fail-open lineage_emit() for Mage blocks/callbacks
harness/              compose, seed SQL, ingestion workflow, scripts
tests/                pytest suite + demo Mage project fixture
```

---

## Scope and non-goals

- No database introspection, no table/column creation.
- No file/object-storage lineage; Spark/Databricks is delegated to OpenLineage.
- dbt manifest analysis is supported per block (`dbt_model` / `dbt_manifest`); a block
  that runs a whole dbt project should add one block per model, or delegate dbt lineage
  to dbt's own OpenMetadata integration.
- A packaged OMD connector service type is a later phase.
