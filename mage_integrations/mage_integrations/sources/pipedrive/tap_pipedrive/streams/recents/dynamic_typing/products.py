from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentProductsStream(DynamicTypingRecentsStream):
    items = 'product'
    schema = 'products'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'productFields'
    static_fields = ['active_flag', 'add_time', 'code', 'files_count', 'first_char', 'followers_count', 'id', 'name',
                     'owner_id', 'owner_name', 'prices', 'selectable', 'tax', 'unit', 'update_time', 'visible_to']
