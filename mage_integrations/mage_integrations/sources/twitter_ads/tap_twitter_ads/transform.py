from datetime import timedelta
import json
import hashlib
import singer
from singer.utils import strptime_to_utc, strftime

LOGGER = singer.get_logger()


# Create MD5 hash key for data element
def hash_data(data):
    # Prepare the project id hash
    hash_id = hashlib.md5()
    hash_id.update(repr(data).encode('utf-8'))
    return hash_id.hexdigest()


# Transform for report_data in sync_report
def transform_report(report_name, report_data, account_id):
    time_series_length = int(report_data.get('time_series_length', 1)) # Default = 1 to loop once
    request = report_data.get('request', {})

    # request params
    params = request.get('params', {})
    entity = params.get('entity')
    granularity = params.get('granularity')
    placement = params.get('placement')
    segmentation_type = params.get('segmentation_type')
    country = params.get('country')
    platform = params.get('platform')
    start_time = params.get('start_time')
    end_time = params.get('end_time')

    LOGGER.info('Report: {} - transform_report, absolute start_time: {}'.format(
        report_name, start_time))
    LOGGER.info('Report: {} - transform_report, absoluted end_time: {}'.format(
        report_name, end_time))
    LOGGER.info('Report: {} - transform_report, time_series_length: {}'.format(
        report_name, time_series_length))

    report_records = []

    if granularity == 'DAY':
        interval = timedelta(days=1)
    elif granularity == 'HOUR':
        interval = timedelta(hours=1)
    elif granularity == 'TOTAL':
        interval = timedelta(days=0) # 0 days for TOTAL

    # Loop through entity_id records w/ data
    for id_record in report_data.get('data'):
        # LOGGER.info('id_record = {}'.format(id_record)) # COMMENT OUT
        entity_id = id_record.get('id')
        # LOGGER.info('entity_id = {}'.format(entity_id)) # COMMENT OUT
        id_data = []
        id_data = id_record.get('id_data')

        # Loop through id_data records
        for datum in id_data:
            # Loop through time intervals
            start_dttm = strptime_to_utc(start_time)
            end_dttm = start_dttm + interval
            i = 0
            while i <= (time_series_length - 1):
                series_start = strftime(start_dttm)
                series_end = strftime(end_dttm)

                append_record = False # Initialize; only append records w/ metric data
                segment = datum.get('segment')
                segment_name = None
                segment_value = None
                if segment:
                    segment_name = segment.get('segment_name')
                    segment_value = segment.get('segment_value')

                dimensions = {
                    'report_name': report_name,
                    'account_id': account_id,
                    'entity': entity,
                    'entity_id': entity_id,
                    'granularity': granularity,
                    'placement': placement,
                    'start_time': series_start,
                    'end_time': series_end,
                    'segmentation_type': segmentation_type,
                    'segment_name': segment_name,
                    'segment_value': segment_value,
                    'country': country,
                    'platform': platform
                }

                # Create MD5 hash key of sorted json dimesions (above)
                dims_md5 = str(hash_data(json.dumps(dimensions, sort_keys=True)))
                record = {
                    '__sdc_dimensions_hash_key': dims_md5,
                    'start_time': series_start,
                    'end_time': series_end,
                    'dimensions': dimensions
                }

                # LOGGER.info('dimensions_hash_key = {}'.format(dims_md5)) # COMMENT OUT

                # Get time interval value from metrics value arrays
                metrics = datum.get('metrics', {})
                for key, val in list(metrics.items()):
                    # Determine nested object group for each measure
                    if key[0:7] == 'billed_':
                        group = 'billing'
                    elif key[0:6] == 'media_':
                        group = 'media'
                    elif key[0:6] == 'video_':
                        group = 'video'
                    elif key[0:11] == 'conversion_':
                        group = 'web_conversion'
                    elif key[0:18] == 'mobile_conversion_':
                        group = 'mobile_conversion'
                    else:
                        group = 'engagement'
                    # Create group node if not exists
                    if not record.get(group):
                        record[group] = {}

                    if isinstance(val, list):
                        index_val = None
                        try:
                            index_val = val[i]
                            record[group][key] = index_val
                            append_record = True
                        except IndexError:
                            index_val = None
                    elif isinstance(val, dict):
                        new_dict = {}
                        for key2, val2 in list(val.items()):
                            idx_val = None
                            if isinstance(val2, list):
                                try:
                                    idx_val = val2[i]
                                    new_dict[key2] = idx_val
                                    append_record = True
                                except IndexError:
                                    idx_val = None
                        if new_dict != {}:
                            record[group][key] = new_dict
                    # End for key, val in metrics

                # LOGGER.info('record = {}'.format(record)) # COMMENT OUT
                # LOGGER.info('append_record = {}'.format(append_record)) # COMMENT OUT
                if append_record:
                    report_records.append(record)
                i = i + 1
                start_dttm = end_dttm
                end_dttm = start_dttm + interval
                # End: while i < time_series_length

            # End: for datum in id_data

        # End: for id_record in report_data

    return report_records


# Transform for record in sync_endpoint
def transform_record(stream_name, record):
    new_record = record
    return new_record
