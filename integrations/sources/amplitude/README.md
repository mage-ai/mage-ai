python t_source_amplitude.py --config sources/amplitude/config.json --discover --key_properties uuid,amplitude_id > sources/amplitude/catalog.json

touch sources/amplitude/state.json
python t_source_amplitude.py --config sources/amplitude/config.json --catalog sources/amplitude/catalog.json  --state sources/amplitude/state.json

https://www.docs.developers.amplitude.com/analytics/apis/export-api/#properties

## Config

`config.json`

```json
{
  "api_key": "abc...",
  "secret_key": "1234..."
}

```

## Query

`query.json`

```json
{
  "start_date": "2022-10-01",
  "end_date": "2022-10-02"
}
```
