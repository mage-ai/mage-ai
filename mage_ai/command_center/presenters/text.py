from mage_ai.command_center.constants import ApplicationExpansionUUID


def application_title(uuid: ApplicationExpansionUUID) -> str:
    if ApplicationExpansionUUID.VersionControlFileDiffs == uuid:
        return 'version control file diffs'
    if ApplicationExpansionUUID.ArcaneLibrary == uuid:
        return 'the Text Editor'
    return f'the {uuid} application'
