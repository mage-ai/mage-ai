from datetime import datetime, timedelta
import dateutil


def build_date_range(
    end_date=None,
    offset=None,
    sample=False,
    start_date=None,
):
    now = datetime.today()
    today = datetime(now.year, now.month, now.day, 0)

    if start_date:
        if offset is not None:
            start_date = start_date + timedelta(hours=offset)
    elif sample:
        start_date = today - timedelta(days=2)
    else:
        # set default to a year in the past. if we don't set a start date, we might make too many
        # requests to amplitude.
        start_date = today - timedelta(days=365)

    if end_date:
        if start_date > end_date:
            return None, None
        if offset is not None:
            end_date = start_date
    elif sample:
        end_date = start_date + timedelta(hours=1)
    else:
        end_date = today + timedelta(hours=23)

    if type(start_date) is str:
        start_date = dateutil.parser.parse(start_date)
    if type(end_date) is str:
        end_date = dateutil.parser.parse(end_date)

    return start_date, end_date
