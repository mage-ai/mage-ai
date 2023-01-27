import datetime
import singer
import time


MAX_METRIC_JOB_TIME = 1800
METRIC_JOB_POLL_SLEEP = 3


def get_metric(client, metric, start_date, end_date, logger):
    logger.info('Metrics query - metric: {} start_date: {} end_date: {} '.format(
        metric,
        start_date,
        end_date))
    response = client.post(
        '/analytics/reports',
        {
            'start': start_date,
            'end': end_date,
            'metrics[]': metric,
        },
    )
    report_link = response['_links']['_self']
    start = time.monotonic()
    while True:
        if (time.monotonic() - start) >= MAX_METRIC_JOB_TIME:
            raise Exception(f'Metric job timeout ({MAX_METRIC_JOB_TIME} secs)')
        report = client.get(report_link)
        progress = report['progress']
        logger.info(f'Report progress: {progress}.')
        if progress == 100:
            logger.info(report)
            return report['metrics']
        time.sleep(METRIC_JOB_POLL_SLEEP)


def fetch_data(
    client,
    metric,
    incremental_range,
    start_date,
    end_date,
    logger,
):
    start_date_formatted = datetime.datetime.utcfromtimestamp(start_date).strftime('%Y-%m-%d')
    with singer.metrics.job_timer('daily_aggregated_metric'):
        start = time.monotonic()
        # we've really moved this functionality to the request in the http script
        # so we don't expect that this will actually have to run mult times
        while True:
            if (time.monotonic() - start) >= MAX_METRIC_JOB_TIME:
                raise Exception('Metric job timeout ({} secs)'.format(
                    MAX_METRIC_JOB_TIME))
            data = get_metric(client, metric, start_date, end_date, logger)
            if data != '':
                break
            else:
                time.sleep(METRIC_JOB_POLL_SLEEP)

    data_rows = []
    # transform the team_table data
    if metric == 'team_table':
        for row in data:

            # One of the row returned from frontapp is an aggregate row
            # and has a slightly different form
            if 'url' not in row[0]:
                row[0]['url'] = ''

            if 'id' not in row[0]:
                row[0]['id'] = 0

            if 'p' not in row[0]:
                row[0]['p'] = row[0]['v']

            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'teammate_v': row[0]['v'],
                'teammate_url': row[0]['url'],
                'teammate_id': row[0]['id'],
                'teammate_p': row[0]['p'],
                'num_conversations_v': row[1]['v'],
                'num_conversations_p': row[1]['p'],
                'avg_message_conversations_v': row[2]['v'],
                'avg_message_conversations_p': row[2]['p'],
                'avg_reaction_time_v': row[3]['v'],
                'avg_reaction_time_p': row[3]['p'],
                'avg_first_reaction_time_v': row[4]['v'],
                'avg_first_reaction_time_p': row[4]['p'],
                'num_messages_v': row[5]['v'],
                'num_messages_p': row[5]['p'],
                'num_sent_v': row[6]['v'],
                'num_sent_p': row[6]['p'],
                'num_replied_v': row[7]['v'],
                'num_replied_p': row[7]['p'],
                'num_composed_v': row[8]['v'],
                'num_composed_p': row[8]['p']
                })

    # transform the team_table data
    if metric == 'tags_table':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'tag_v': row[0]['v'],
                'tag_url': row[0]['url'],
                'tag_id': row[0]['id'],
                'conversations_archived_v': row[1]['v'],
                'conversations_archived_p': row[1]['p'],
                'conversations_open_v': row[2]['v'],
                'conversations_open_p': row[2]['p'],
                'conversations_total_v': row[3]['v'],
                'conversations_total_p': row[3]['p'],
                'num_messages_v': row[4]['v'],
                'num_messages_p': row[4]['p'],
                'avg_message_conversations_v': row[5]['v'],
                'avg_message_conversations_p': row[5]['p']
                })

    # transform the customers_table data
    if metric == 'customers_table':
        for row in data:

            # Some resource (ex. of type 'contact') don't have URLs
            if 'url' not in row[0]:
                row[0]['url'] = None

            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'resource_t': row[0]['t'],
                'resource_v': row[0]['v'],
                'resource_id': row[0]['id'],
                'resource_url': row[0]['url'],
                'num_received_v': row[1]['v'],
                'num_received_p': row[1]['p'],
                'num_sent_v': row[2]['v'],
                'num_sent_p': row[2]['p'],
                'avg_first_response_v': row[3]['v'],
                'avg_first_response_p': row[3]['p'],
                'avg_response_v': row[4]['v'],
                'avg_response_p': row[4]['p'],
                'avg_resolution_v': row[5]['v'],
                'avg_resolution_p': row[5]['p']
                })

    # transform the first_response_histo data
    if metric == 'first_response_histo':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'time_v': row[0]['v'],
                'replies_v': row[1]['v'],
                'replies_p': row[1]['p']
                })

    # transform the resolution_histo data
    if metric == 'resolution_histo':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'time_v': row[0]['v'],
                'resolutions_v': row[1]['v'],
                'resolutions_p': row[1]['p']
                })

    # transform the response_histo data
    if metric == 'response_histo':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'time_v': row[0]['v'],
                'replies_v': row[1]['v'],
                'replies_p': row[1]['p']
                })

    # transform the top_conversations_table data
    if metric == 'top_conversations_table':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'teammate_v': row[0]['v'],
                'teammate_url': row[0]['url'],
                'teammate_id': row[0]['id'],
                'num_conversations_v': row[1]['v'],
                'num_conversations_p': row[1]['p']
                })

    # transform the top_reaction_time_table data
    if metric == 'top_reaction_time_table':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'teammate_v': row[0]['v'],
                'teammate_url': row[0]['url'],
                'teammate_id': row[0]['id'],
                'avg_reaction_time_v': row[1]['v'],
                'avg_reaction_time_p': row[1]['p']
                })

    # transform the top_replies_table data
    if metric == 'top_replies_table':
        for row in data:
            data_rows.append({
                'analytics_date': start_date_formatted,
                'analytics_range': incremental_range,
                'teammate_v': row[0]['v'],
                'teammate_url': row[0]['url'],
                'teammate_id': row[0]['id'],
                'num_replies_v': row[1]['v'],
                'num_replies_p': row[1]['p']
                })
    return data_rows
