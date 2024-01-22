# from datetime import datetime

import pandas as pd
from faker import Faker
from faker.providers import currency

from mage_ai.shared.multi import run_parallel_multiple_args

# from pandas.core import dtypes


faker = Faker()
faker.add_provider(currency)


def get_data(column, column_type, faker=faker):
    if column.endswith('date'):
        return faker.date_time()
    elif column_type == 'int64':
        return faker.random_int()
    elif column_type == 'int32':
        return faker.random_int()
    elif column_type == 'float64':
        return faker.random_int() / (faker.random_int() + 1)
    elif column_type == 'object':
        if column.endswith('name') or column.endswith('company'):
            return faker.name()
        return faker.sentence()
    else:
        return faker.word()


cols = [
    ('account_name', 'object'),
    ('account_id', 'int64'),
    ('channel_id', 'int32'),
    ('channel_name', 'object'),
    ('country_code', 'object'),
    ('currency_code', 'object'),
    ('product', 'object'),
    ('sku', 'object'),
    ('report_date', 'object'),
    ('product_title', 'object'),
    ('ad_impressions', 'int64'),
    ('ad_clicks', 'int64'),
    ('ad_spend', 'object'),
    ('ad_revenue', 'object'),
    ('ad_orders', 'int64'),
    ('ad_conversions', 'float64'),
    ('product_sales', 'object'),
    ('product_quantity', 'float64'),
    ('shipped_cogs', 'object'),
    ('shipped_units', 'float64'),
    ('shipped_revenue', 'object'),
    ('ordered_units', 'float64'),
    ('ordered_revenue', 'object'),
    ('best_seller_rank', 'float64'),
    ('best_seller_category', 'object'),
    ('title_length', 'float64'),
    ('description_length', 'float64'),
    ('feature_bullet_count', 'float64'),
    ('aplus_page', 'object'),
    ('image_count', 'float64'),
    ('average_rating', 'object'),
    ('seller_company', 'object'),
    ('review_count', 'float64'),
    ('description', 'object'),
    ('rating_count', 'float64'),
    ('sourcing_shipped_cogs', 'object'),
    ('sourcing_shipped_units', 'float64'),
    ('sourcing_shipped_revenue', 'object'),
    ('sourcing_ordered_units', 'float64'),
    ('sourcing_ordered_revenue', 'object'),
    ('browser_session', 'float64'),
    ('mobile_app_session', 'float64'),
    ('buy_box_prcntg', 'object'),
    ('browser_sessions_prcntg', 'object'),
    ('mobile_app_sessions_prcntg', 'object'),
    ('revenue_same_sku', 'object'),
    ('conversions_same_sku', 'object'),
    ('total_ordered_items', 'float64'),
    ('sub_brand', 'object'),
]


def build_row(*args, **kwargs):
    data = {}
    for column, column_type in cols:
        data[column] = get_data(column, column_type)
    return data


count = 594525
count = 1000
# <class 'pandas.core.frame.DataFrame'>

# df = pd.DataFrame([build_row() for i in range(count)])


arr = pd.DataFrame(run_parallel_multiple_args(build_row, [i for i in range(count)]))
