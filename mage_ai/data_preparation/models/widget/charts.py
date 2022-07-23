import math


MAX_BUCKETS = 40


def build_buckets(min_value, max_value, max_buckets):
    diff = max_value - min_value
    total_interval = 1 + diff
    bucket_interval = total_interval / max_buckets
    number_of_buckets = max_buckets

    is_integer = False
    parts = str(diff).split('.')
    if len(parts) == 1:
        is_integer = True
    else:
        is_integer = int(parts[1]) == 0

    if is_integer and total_interval <= max_buckets:
        number_of_buckets = int(total_interval)
        bucket_interval = 1
    elif bucket_interval > 1:
        bucket_interval = math.ceil(bucket_interval)
    else:
        bucket_interval = round(bucket_interval * 100, 1) / 100

    buckets = []
    for i in range(number_of_buckets):
        min_v = min_value + (i * bucket_interval)
        max_v = min_value + ((i + 1) * bucket_interval)
        if max_value >= min_v:
            buckets.append(dict(
                max_value=max_v,
                min_value=min_v,
                values=[],
            ))

    return buckets, bucket_interval


def build_histogram_data(arr, max_buckets):
    max_value = max(arr)
    min_value = min(arr)

    buckets, bucket_interval = build_buckets(min_value, max_value, max_buckets)

    if bucket_interval == 0:
        return

    for value in arr:
        index = math.floor((value - min_value) / bucket_interval)
        if value == max_value:
            index = len(buckets) - 1
        buckets[index]['values'].append(value)

    x = []
    y = []

    for bucket in buckets:
        x.append(dict(
            max=bucket['max_value'],
            min=bucket['min_value'],
        ))
        y.append(dict(value=len(bucket['values'])))

    return dict(
        x=x,
        y=y,
    )
