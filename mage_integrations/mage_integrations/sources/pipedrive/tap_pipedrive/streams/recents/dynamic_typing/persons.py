from tap_pipedrive.streams.recents.dynamic_typing import DynamicTypingRecentsStream


class RecentPersonsStream(DynamicTypingRecentsStream):
    items = 'person'
    schema = 'persons'
    key_properties = ['id', ]
    state_field = 'update_time'
    fields_endpoint = 'personFields'
    static_fields = ['active_flag', 'activities_count', 'add_time', 'cc_email', 'closed_deals_count', 'company_id',
                     'done_activities_count', 'email', 'email_messages_count', 'files_count', 'first_char',
                     'first_name', 'followers_count', 'id', 'last_activity_date', 'last_activity_id',
                     'last_incoming_mail_time', 'last_name', 'last_outgoing_mail_time', 'lost_deals_count', 'name',
                     'next_activity_date', 'next_activity_id', 'next_activity_time', 'notes_count', 'open_deals_count',
                     'org_id', 'org_name', 'owner_id', 'owner_name', 'participant_closed_deals_count',
                     'participant_open_deals_count', 'phone', 'picture_id', 'reference_activities_count',
                     'related_closed_deals_count', 'related_lost_deals_count', 'related_open_deals_count',
                     'related_won_deals_count', 'timeline_last_activity_time', 'timeline_last_activity_time_by_owner',
                     'undone_activities_count', 'update_time', 'visible_to', 'won_deals_count']
