import datetime
import math

def date_intervals(start_date, end_date, timedelta):
    tzinfos = list(filter(lambda x: x, [end_date.tzinfo, start_date.tzinfo]))
    if len(tzinfos) == 1:
        tzinfo = tzinfos[0]
        if not end_date.tzinfo:
            end_date = end_date.replace(tzinfo=tzinfo)
        if not start_date.tzinfo:
            start_date = start_date.replace(tzinfo=tzinfo)

    total_seconds = (end_date - start_date).total_seconds()
    timedelta_seconds = timedelta.total_seconds()
    number_of_intervals = math.floor(total_seconds / timedelta_seconds)

    arr = []

    if number_of_intervals:
        for i in range(0, number_of_intervals):
            start_time = start_date + (timedelta * i)
            end_time = (start_time + timedelta) - datetime.timedelta(seconds=1)
            arr.append((start_time, end_time))

        remainder = total_seconds % timedelta_seconds
        if remainder:
            last_end_time = arr[-1][1]
            arr.append((
                last_end_time + datetime.timedelta(seconds=1),
                last_end_time + datetime.timedelta(seconds=remainder),
            ))
    else:
        arr.append((start_date, end_date))

    return arr
