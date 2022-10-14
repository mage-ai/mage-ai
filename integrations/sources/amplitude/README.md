python t_source_amplitude.py --config sources/amplitude/config.json --discover --key_properties uuid,amplitude_id > sources/amplitude/catalog.json

touch sources/amplitude/state.json
python t_source_amplitude.py --config sources/amplitude/config.json --catalog sources/amplitude/catalog.json  --state sources/amplitude/state.json

https://www.docs.developers.amplitude.com/analytics/apis/export-api/#properties