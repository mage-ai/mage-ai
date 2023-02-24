import datetime
import pytz


def compare(date1: datetime, date2: datetime) -> int:
    if date1 is None or date2 is None:
        return None

    date1_utc = date1.astimezone(pytz.UTC)
    date2_utc = date2.astimezone(pytz.UTC)

    if date1_utc < date2_utc:
        return -1
    elif date1_utc > date2_utc:
        return 1
    else:
        return 0


def n_days_ago(n: int) -> str:
    day = datetime.datetime.now() - datetime.timedelta(days=n)
    return day.strftime('%Y-%m-%d')


def str_to_timedelta(period_str: str):
    unit = period_str[-1]
    if unit not in ['d', 'h', 'w']:
        raise Exception(
            'Please provide a valid period unit ("d", "h", or "w")')
    if unit == 'd':
        return datetime.timedelta(days=int(period_str[:-1]))
    elif unit == 'h':
        return datetime.timedelta(hours=int(period_str[:-1]))
    elif unit == 'w':
        return datetime.timedelta(weeks=int(period_str[:-1]))
    return None
