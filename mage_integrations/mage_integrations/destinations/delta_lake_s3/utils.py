import json


def fix_overwritten_partitions(client, bucket: str, key: str, version: int) -> None:
    current = __get_logs(client, bucket, key, version)

    partition_values = [row['add']['partitionValues'] for row in current['add']]
    removes_updated = [row for row in current['remove'] if row['remove']['partitionValues'] in partition_values]

    final_rows = current['add'] + removes_updated + current['other']

    body = '\n'.join([json.dumps(row) for row in final_rows])

    client.put_object(
        Body=body.encode(),
        Bucket=bucket,
        Key=__version_log_key(key, version),
    )


def __version_string(version: int) -> str:
    version_string = str(version)
    for i in range(20 - len(version_string)):
        version_string = f'0{version_string}'

    return version_string


def __version_log_key(key: str, version: int) -> str:
    return f'{key}/{__version_string(version)}.json'


def __get_logs(client, bucket: str, key: str, version: int) -> None:
    data = client.get_object(Bucket=bucket, Key=__version_log_key(key, version))
    content = data['Body'].read().decode()
    lines = content.split('\n')

    rows = [json.loads(line) for line in lines if line]

    add_rows = []
    remove_rows = []
    other_rows = []
    for row in rows:
        if 'add' in row:
            add_rows.append(row)
        elif 'remove' in row:
            remove_rows.append(row)
        else:
            other_rows.append(row)

    return dict(add=add_rows, remove=remove_rows, other=other_rows)
