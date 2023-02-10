import singer
from singer import metrics, metadata, Transformer
from singer.bookmarks import set_currently_syncing
from mage_integrations.sources.messages import write_schema as write_schema_orig
from datetime import datetime, timedelta
import dateutil.parser

LOGGER = singer.get_logger()

STREAM_CONFIGS = {
    'accounts': {
        'url_path': 'accounts',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'creatorId',
            'ownerId',
            'updaterId'
        ]
    },
    'call_dispositions': {
        'url_path': 'callDispositions',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId']
    },
    'call_purposes': {
        'url_path': 'callPurposes',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId']
    },
    'calls': {
        'url_path': 'calls',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'callDispositionId',
            'callPurposeId',
            'opportunityId',
            'prospectId',
            'sequenceId',
            'sequenceStateId',
            'sequenceStepId',
            'taskId',
            'userId'
        ]
    },
    'content_categories': {
        'url_path': 'contentCategories',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId']
    },
    'duties': {
        'url_path': 'duties',
        'replication': 'FULL_TABLE'
    },
    'events': {
        'url_path': 'events',
        'replication': 'INCREMENTAL',
        'filter_field': 'eventAt',
        'fks': ['prospectId', 'userId']
    },
    'mailboxes': {
        'url_path': 'mailboxes',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId', 'updaterId']
    },
    'mailings': {
        'url_path': 'mailings',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'calendarId',
            'mailboxId',
            'opportunityId',
            'prospectId',
            'sequenceId',
            'sequenceStateId',
            'sequenceStepId',
            'taskId',
            'templateId'
        ]
    },
    'opportunities': {
        'url_path': 'opportunities',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'accountId',
            'creatorId',
            'opportunityStageId',
            'ownerId'
        ]
    },
    'personas': {
        'url_path': 'personas',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt'
    },
    'prospects': {
        'url_path': 'prospects',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'accountId',
            'creatorId',
            'defaultPluginMappingId',
            'ownerId',
            'personaId',
            'stageId',
            'updaterId'
        ]
    },
    'stages': {
        'url_path': 'stages',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId', 'updaterId']
    },
    'sequences': {
        'url_path': 'sequences',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId', 'ownerid', 'updaterId']
    },
    'sequence_states': {
        'url_path': 'sequenceStates',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['accountid', 'creatorId', 'prospectId', 'sequenceId']
    },
    'sequence_steps': {
        'url_path': 'sequenceSteps',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': ['creatorId', 'sequenceId', 'updaterId']
    },
    'sequence_templates': {
        'url_path': 'sequenceTemplates',
        'replication': 'FULL_TABLE',
        'filter_field': 'updatedAt',
        'fks': ['creatorId', 'updaterId']
    },
    'tasks': {
        'url_path': 'tasks',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'accountId',
            'callId',
            'completerId',
            'creatorId',
            'mailingId',
            'opportunityId',
            'ownerId',
            'prospectId',
            'sequenceId',
            'sequenceStateId',
            'sequenceStepId',
            'subjectId',
            'taskPriorityId',
            'taskThemeId',
            'templateId'
        ]
    },
    'teams': {
        'url_path': 'teams',
        'replication': 'FULL_TABLE',
        'fks': ['creatorId', 'updaterId']
    },
    'users': {
        'url_path': 'users',
        'replication': 'INCREMENTAL',
        'filter_field': 'updatedAt',
        'fks': [
            'calendarId',
            'mailboxId',
            'profileId',
            'roleId',
            'creatorId',
            'updaterId'
        ]
    }
}


def get_bookmark(state, stream_name, default):
    return state.get('bookmarks', {}).get(stream_name, default)


def write_bookmark(state, stream_name, value, bookmark_key: str):
    if 'bookmarks' not in state:
        state['bookmarks'] = {}
    state = singer.write_bookmark(state, stream_name, bookmark_key, value)
    singer.write_state(state)


def write_schema(stream):
    schema = stream.schema.to_dict()
    write_schema_orig(
        stream_name=stream.tap_stream_id,
        schema=schema,
        key_properties=stream.key_properties,
        bookmark_properties=stream.bookmark_properties,
        disable_column_type_check=stream.disable_column_type_check,
        partition_keys=stream.partition_keys,
        replication_method=stream.replication_method,
        stream_alias=stream.stream_alias,
        unique_conflict_method=stream.unique_conflict_method,
        unique_constraints=stream.unique_constraints,
    )


def process_records(stream, mdata, max_modified, records, filter_field, fks):
    schema = stream.schema.to_dict()
    with metrics.record_counter(stream.tap_stream_id) as counter:
        for record in records:
            record_flat = {
                'id': record['id']
            }
            for prop, value in record['attributes'].items():
                if prop == 'id':
                    raise Exception(
                        'Error flattening Outeach record - conflict with `id` key')
                record_flat[prop] = value

            if 'relationships' in record:
                for prop, value in record['relationships'].items():
                    if 'data' not in value and 'links' not in value:
                        raise Exception(
                            'Only `data` or `links` expected in relationships')

                    fk_field_name = '{}Id'.format(prop)

                    if 'data' in value and fk_field_name in fks:
                        data_value = value['data']
                        if data_value is not None and 'id' not in data_value:
                            raise Exception(
                                'null or `id` field expected for `data` relationship')

                        if fk_field_name in record_flat:
                            print(
                                f'`{fk_field_name}` exists as both an attribute and generated '
                                'relationship name',
                            )

                        if data_value == None:
                            record_flat[fk_field_name] = None
                        else:
                            record_flat[fk_field_name] = data_value['id']

            if filter_field in record_flat and record_flat[filter_field] > max_modified:
                max_modified = record_flat[filter_field]

            with Transformer() as transformer:
                record_typed = transformer.transform(record_flat,
                                                     schema,
                                                     mdata)
            singer.write_record(stream.tap_stream_id, record_typed)
            counter.increment()
        return max_modified


def sync_endpoint(client, config, catalog, state, start_date, stream, mdata, logger=LOGGER):
    stream_name = stream.tap_stream_id
    last_datetime = get_bookmark(state, stream_name, start_date)

    if last_datetime and type(last_datetime) is dict:
        for ds in last_datetime.values():
            try:
                last_ds = dateutil.parser.parse(ds)
                now = datetime.utcnow().replace(tzinfo=last_ds.tzinfo)
                if now < last_ds + timedelta(days=1):
                    logger.info(f'Skipping stream {stream.tap_stream_id} because bookmark '
                                f'{last_datetime} is less than 1 day ago.')
                    return
            except dateutil.parser.ParserError:
                pass
        last_datetime = max(last_datetime.values())

    write_schema(stream)

    stream_config = STREAM_CONFIGS[stream_name]
    filter_field = stream_config.get('filter_field')
    fks = stream_config.get('fks', [])

    # Pagination: https://api.outreach.io/api/v2/docs#pagination
    # Changed to cursor-based pagination (not offset); offset still used for logging
    offset = 0
    count = int(config.get('page_size', 250))
    has_more = True
    max_modified = last_datetime
    paginate_datetime = last_datetime
    page = 1
    next_url = None

    while has_more:
        # query_params only needed for first page, next_url incl. params
        if page == 1:
            query_params = {
                'page[size]': count,
                'count': 'false'
            }
            if stream_config.get('replication') == 'INCREMENTAL':
                query_params[f'filter[{filter_field}]'] = f'{paginate_datetime}..inf'
                query_params['sort'] = filter_field

        logger.info('{} - Syncing data since {} - page: {}, limit: {}, offset: {}'.format(
            stream.tap_stream_id,
            last_datetime,
            page,
            count,
            offset))

        querystring = '&'.join(['%s=%s' % (key, value)
                                for (key, value) in query_params.items()])
        if page == 1:
            data = client.get(
                path=stream_config['url_path'],
                params=querystring,
                endpoint=stream_name)
        else:  # next_url
            data = client.get(
                url=next_url,
                params=query_params,
                endpoint=stream_name)

        records = data.get('data', [])
        next_url = data.get('links', {}).get('next', None)

        if not next_url:
            has_more = False
        else:
            # LOGGER.info('next_url: {}'.format(next_url))
            offset += count
            page = page + 1

        max_modified = process_records(stream,
                                       mdata,
                                       max_modified,
                                       records,
                                       filter_field,
                                       fks)

        if stream_config.get('replication') == 'INCREMENTAL':
            write_bookmark(state, stream_name, max_modified, filter_field)


def update_current_stream(state, stream_name=None):
    set_currently_syncing(state, stream_name)
    singer.write_state(state)


def sync(client, config, catalog, state, start_date, logger=LOGGER):
    selected_streams = catalog.get_selected_streams(state)
    selected_streams = sorted(selected_streams, key=lambda x: x.tap_stream_id)

    for stream in selected_streams:
        mdata = metadata.to_map(stream.metadata)
        update_current_stream(state, stream.tap_stream_id)
        sync_endpoint(
            client,
            config,
            catalog,
            state,
            start_date,
            stream,
            mdata,
            logger=logger,
        )

    update_current_stream(state)
