from mage_ai.command_center.constants import ApplicationExpansionUUID


def application_title(uuid: ApplicationExpansionUUID) -> str:
    if ApplicationExpansionUUID.VersionControlFileDiffs == uuid:
        return 'version control file diffs'
