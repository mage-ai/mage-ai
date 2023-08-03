import datetime
import pytz

from mage_ai.shared.array import find_index


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


def week_of_month(day: datetime.datetime) -> int:
    first_day = day.replace(day=1)
    # e.g. 4 for Friday
    first_day_weekday = first_day.weekday()

    # e.g. 7 - 5 = 2
    first_week_last_day = 7 - ((first_day_weekday + 1) % 7)
    day_ranges_per_week = [
        # If the 1st day is Friday, then Saturday is the 2nd, and that is the end of the 1st week
        (1, first_week_last_day),
    ]

    for i in range(0, 5):
        # 0: (3, 9)
        # 1: (10, 16)
        # 2: (17, 23)
        # 3: (24, 30)
        # 4: (31, 37)
        day_ranges_per_week.append(
            (first_week_last_day + 1 + (7 * i), first_week_last_day + (7 * (i + 1))),
        )

    # If the first day of the month is a Friday, here are the day ranges for each week:
    # Week 1: 1 - 2
    # Week 2: 3 - 9
    # Week 3: 10 - 16
    # Week 4: 17 - 23
    # Week 5: 24 - 30
    # Week 6: 31 - 37

    day_of_month = day.day

    def _compare(tup):
        week_start, week_end = tup
        return day_of_month >= week_start and day_of_month <= week_end

    return find_index(_compare, day_ranges_per_week) + 1
