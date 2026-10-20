STATS = {}

# example = {
#     '<table_name>': {
#         'search_prefix': 'folder1',
#         'search_pattern': 'file.*.csv'
#         'files': {
#             '<filepath>': {
#                 'row_count': 100,
#                 'last_modified': '10-03-2018T5:00:00'
#             },
#             'folder1/file_1.csv': {
#                 'row_count': 50,
#                 'last_modified': '10-04-2018T8:00:00'
#             }
#         }
#     }
# }


def add_file_data(table_spec, filepath, last_modified, row_count):
    table_name = table_spec['table_name']
    global STATS
    if STATS.get(table_name):
        STATS[table_name]['files'][filepath] = {
            'last_modified': last_modified,
            'row_count': row_count
        }
    else:
        initialize_table_stats(table_spec)

        STATS[table_name]['files'][filepath] = {
            'last_modified': last_modified,
            'row_count': row_count
        }


def initialize_table_stats(table_spec):
    global STATS
    STATS[table_spec['table_name']] = {
        'search_prefix': table_spec['search_prefix'],
        'search_pattern': table_spec['search_pattern'],
        'files': {}
    }
