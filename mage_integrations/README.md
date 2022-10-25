## Set up

1. Run Mage in a Docker container using `./scripts/dev.sh`.
1. Open another terminal and run:
    ```bash
    docker exec -it mage-ai_server_1 bash
    ```
1. Uninstall the `mage-integrations` package using `pip`:
    ```bash
    pip3 uninstall -y mage-integrations
    ```
1. Change directory into `mage_integrations/`.

## Testing sync locally

Create a files:

```
TEST_CATALOG.json
TEST_CONFIG_S.json
TEST_STATE.json

TEST_CONFIG_D.json
TEST_STATE
```

Run

```bash
python3 mage_integrations/sources/amplitude/__init__.py --config TEST_CONFIG_S.json --catalog TEST_CATALOG.json --state TEST_STATE.json | python3 mage_integrations/destinations/snowflake/__init__.py --config TEST_CONFIG_D.json --state TEST_STATE
```
