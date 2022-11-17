SQL_SOURCES = [
    dict(name='BigQuery'),
    dict(name='MySQL'),
    dict(name='PostgreSQL'),
    dict(name='Redshift'),
]

SOURCES = sorted([
    dict(name='Amplitude'),
    dict(name='Chargebee'),
    dict(name='Google Search Console'),
    dict(name='Google Sheets'),
    dict(name='Intercom'),
    dict(name='Salesforce'),
    dict(name='Stripe'),
] + SQL_SOURCES, key=lambda x: x['name'])
