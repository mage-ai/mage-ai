from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentActivitiesStream(DynamicTypingRecentsStream):
    items = 'activity'
    schema = 'activities'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'activityFields'
    static_fields = ['active_flag', 'add_time', 'assigned_to_user_id', 'company_id', 'created_by_user_id',
                     'deal_dropbox_bcc', 'deal_id', 'deal_title', 'done', 'due_date', 'due_time', 'duration',
                     'gcal_event_id', 'google_calendar_etag', 'google_calendar_id', 'id', 'marked_as_done_time', 'note',
                     'org_id', 'org_name', 'owner_name', 'participants', 'person_dropbox_bcc', 'person_id',
                     'person_name', 'reference_id', 'reference_type', 'subject', 'type', 'update_time', 'user_id']
