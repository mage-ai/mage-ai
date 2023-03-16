from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentOrganizationsStream(DynamicTypingRecentsStream):
    items = 'organization'
    schema = 'organizations'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'organizationFields'
    static_fields = ['active_flag', 'activities_count', 'add_time', 'address', 'address_admin_area_level_1',
                     'address_admin_area_level_2', 'address_country', 'address_formatted_address', 'address_locality',
                     'address_postal_code', 'address_route', 'address_street_number', 'address_sublocality',
                     'address_subpremise', 'category_id', 'cc_email', 'closed_deals_count', 'company_id',
                     'country_code', 'done_activities_count', 'email_messages_count', 'files_count', 'first_char',
                     'followers_count', 'id', 'last_activity_date', 'last_activity_id', 'lost_deals_count', 'name',
                     'next_activity_date', 'next_activity_id', 'next_activity_time', 'notes_count', 'open_deals_count',
                     'owner_id', 'owner_name', 'people_count', 'picture_id', 'reference_activities_count',
                     'related_closed_deals_count', 'related_lost_deals_count', 'related_open_deals_count',
                     'related_won_deals_count', 'timeline_last_activity_time', 'timeline_last_activity_time_by_owner',
                     'undone_activities_count', 'update_time', 'visible_to', 'won_deals_count']
