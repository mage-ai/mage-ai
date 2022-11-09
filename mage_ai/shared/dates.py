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
