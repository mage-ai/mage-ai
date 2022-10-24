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
