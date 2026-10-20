from watchdog.events import FileSystemEvent, FileSystemEventHandler

from mage_ai.data_preparation.repo_manager import update_settings_on_metadata_change


class MetadataEventHandler(FileSystemEventHandler):
    def on_modified(self, event: FileSystemEvent):
        super().on_modified(event)

        update_settings_on_metadata_change()
