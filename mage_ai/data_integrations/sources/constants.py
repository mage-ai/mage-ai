SQL_SOURCES = [
    dict(name='BigQuery'),
    dict(name='MySQL'),
    dict(name='PostgreSQL'),
    dict(name='Redshift'),
]

SOURCES = sorted([
    dict(name='Amazon S3'),
    dict(name='Amplitude'),
    dict(name='Api'),
    dict(name='Chargebee'),
    dict(name='Google Analytics'),
    dict(name='Google Search Console'),
    dict(name='Google Sheets'),
    dict(name='Intercom'),
    dict(name='Salesforce'),
    dict(name='Stripe'),
] + SQL_SOURCES, key=lambda x: x['name'])
