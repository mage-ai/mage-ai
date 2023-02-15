from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentDealsStream(DynamicTypingRecentsStream):
    items = 'deal'
    schema = 'deals'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'dealFields'
    static_fields = ['active', 'activities_count', 'add_time', 'cc_email', 'close_time', 'creator_user_id', 'currency',
                     'deleted', 'done_activities_count', 'email_messages_count', 'expected_close_date', 'files_count',
                     'first_won_time', 'followers_count', 'formatted_value', 'formatted_weighted_value', 'id',
                     'last_activity_date', 'last_activity_id', 'last_incoming_mail_time', 'last_outgoing_mail_time',
                     'lost_reason', 'lost_time', 'next_activity_date', 'next_activity_duration', 'next_activity_id',
                     'next_activity_note', 'next_activity_subject', 'next_activity_time', 'next_activity_type',
                     'notes_count', 'org_hidden', 'org_id', 'org_name', 'owner_name', 'participants_count',
                     'person_hidden', 'person_id', 'person_name', 'pipeline_id', 'products_count', 'probability',
                     'reference_activities_count', 'rotten_time', 'stage_change_time', 'stage_id', 'stage_order_nr',
                     'status', 'title', 'undone_activities_count', 'update_time', 'user_id', 'value', 'visible_to',
                     'weighted_value', 'won_time', 'group_id', 'group_name', 'renewal_type']
