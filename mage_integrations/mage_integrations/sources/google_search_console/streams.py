STREAMS = {
    'sites': {
        'key_properties': ['site_url'],
        'replication_method': 'FULL_TABLE',
        'path': 'sites/{}',
        'data_key': 'site_entry',
        'api_method': 'GET'
    },

    'sitemaps': {
        'key_properties': ['site_url', 'path', 'last_submitted'],
        'replication_method': 'FULL_TABLE',
        'path': 'sites/{}/sitemaps',
        'data_key': 'sitemap',
        'api_method': 'GET'
    },

    'performance_report_custom': {
        'key_properties': ['site_url', 'search_type', 'date'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'auto'
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },

    'performance_report_date': {
        'key_properties': ['site_url', 'search_type', 'date'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'byProperty',
            'dimensions': ['date']
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },

    'performance_report_country': {
        'key_properties': ['site_url', 'search_type', 'date', 'country'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'byProperty',
            'dimensions': ['date', 'country']
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },

    'performance_report_device': {
        'key_properties': ['site_url', 'search_type', 'date', 'device'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'byProperty',
            'dimensions': ['date', 'device']
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },

    'performance_report_page': {
        'key_properties': ['site_url', 'search_type', 'date', 'page'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date', 'page'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'byPage',
            'dimensions': ['date', 'page']
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },

    'performance_report_query': {
        'key_properties': ['site_url', 'search_type', 'date', 'query'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['date'],
        'path': 'sites/{}/searchAnalytics/query',
        'data_key': 'rows',
        'api_method': 'POST',
        'row_limit': 10000,
        'body': {
            'aggregationType': 'byProperty',
            'dimensions': ['date', 'query']
        },
        'bookmark_type': 'datetime',
        'pagination': 'body',
        'sub_types': ['web', 'image', 'video']
    },
}
