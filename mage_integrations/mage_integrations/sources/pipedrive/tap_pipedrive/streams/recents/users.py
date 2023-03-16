from tap_pipedrive.streams.recents import RecentsStream


class RecentUsersStream(RecentsStream):
    items = 'user'
    schema = 'users'
    key_properties = ['id', ]
    # temporary disabled due current Pipedrive API limitations
    # state_field = 'modified'
    replication_method = 'FULL_TABLE'

    def process_row(self, row):
        # NB> Temporary split here in response to unintended change made with this changelog
        # - https://developers.pipedrive.com/changelog/post/improvements-to-permissionsets-api-and-users-api
        # - This used to be a list, but turned into an object with this changelog entry's effective date.
        if isinstance(row['data'], dict):
            return row['data']
        else:
            return row['data'][0]
