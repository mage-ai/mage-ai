python t_source_ga.py --config sources/google_analytics/config.json --discover

touch sources/google_analytics/catalog.json
python t_source_ga.py --config sources/google_analytics/config.json --discover > sources/google_analytics/catalog.json

echo {} > sources/google_analytics/state.json
python t_source_ga.py --config sources/google_analytics/config.json --catalog sources/google_analytics/catalog.json  --state sources/google_analytics/state.json
