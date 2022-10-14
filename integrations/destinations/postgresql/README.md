from sources.utils import update_source_state_from_destination_state
update_source_state_from_destination_state('sources/amplitude/state.json', 'destinations/postgresql/state')

python t_source_amplitude.py --config sources/amplitude/config.json --catalog sources/amplitude/catalog.json --state sources/amplitude/state.json | python t_destination_postgres.py --config destinations/postgresql/config.json --state destinations/postgresql/state
