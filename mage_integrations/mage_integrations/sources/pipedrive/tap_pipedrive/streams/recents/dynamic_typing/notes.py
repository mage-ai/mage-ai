from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentNotesStream(DynamicTypingRecentsStream):
    items = 'note'
    schema = 'notes'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'noteFields'
    static_fields = ['active_flag', 'add_time', 'content', 'deal', 'deal_id', 'id', 'last_update_user_id', 'org_id',
                     'organization', 'person', 'person_id', 'pinned_to_deal_flag', 'pinned_to_organization_flag',
                     'pinned_to_person_flag', 'update_time', 'user', 'user_id']
