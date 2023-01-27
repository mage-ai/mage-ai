class IDS(object): # pylint: disable=too-few-public-methods
    TEAM_TABLE = 'team_table'
    TAGS_TABLE = 'tags_table'
    CUSTOMERS_TABLE = 'customers_table'
    FIRST_RESPONSE_HISTO = 'first_response_histo'
    RESOLUTION_HISTO = 'resolution_histo'
    RESPONSE_HISTO = 'response_histo'
    TOP_CONVERSATION_TABLE = 'top_conversations_table'
    TOP_REACTION_TIME_TABLE = 'top_reaction_time_table'
    TOP_REPLIES_TABLE = 'top_replies_table'


PK_FIELDS = {
    IDS.TEAM_TABLE: ['analytics_date', 'analytics_range', 'teammate_v'],
    IDS.TAGS_TABLE: ['analytics_date', 'analytics_range', 'tag_v'],
    IDS.CUSTOMERS_TABLE: ['analytics_date', 'analytics_range', 'resource_t', 'resource_v'],
    IDS.FIRST_RESPONSE_HISTO: ['analytics_date', 'analytics_range', 'time_v'],
    IDS.RESOLUTION_HISTO: ['analytics_date', 'analytics_range', 'time_v'],
    IDS.RESPONSE_HISTO: ['analytics_date', 'analytics_range', 'time_v'],
    IDS.TOP_CONVERSATION_TABLE: ['analytics_date', 'analytics_range', 'teammate_v'],
    IDS.TOP_REACTION_TIME_TABLE: ['analytics_date', 'analytics_range', 'teammate_v'],
    IDS.TOP_REPLIES_TABLE: ['analytics_date', 'analytics_range', 'teammate_v']
}
