import datetime
import pytz

def compare(date1: datetime, date2: datetime) -> int:
    date1_str = date1.strftime(format='%Y%m%dT%H%M%S')
    date2_str = date2.strftime(format='%Y%m%dT%H%M%S')

    if date1_str < date2_str:
        return -1
    elif date1_str > date2_str:
        return 1
    else:
        return 0
