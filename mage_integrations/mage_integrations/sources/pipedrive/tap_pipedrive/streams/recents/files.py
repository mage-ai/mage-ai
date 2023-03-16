from tap_pipedrive.streams.recents import RecentsStream


class RecentFilesStream(RecentsStream):
    items = 'file'
    schema = 'files'
    key_properties = ['id', ]
    state_field = 'update_time'
