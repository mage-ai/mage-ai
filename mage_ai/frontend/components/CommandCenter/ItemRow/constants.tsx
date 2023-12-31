import * as AllIcons from '@oracle/icons';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { CommandCenterItemType, ObjectTypeEnum } from '@interfaces/CommandCenterType';
import {
  BlockGeneric,
  BranchAlt,
  Chat,
  Code,
  DocumentIcon,
  File as FileIcon,
  FolderOutline,
  Lightning,
  NavDashboard,
  PipelineV3,
  Schedule,
} from '@oracle/icons';

export function getIcon(item: CommandCenterItemType) {
  const {
    display_settings_by_attribute: displaySettingsByAttribute,
    metadata,
  } = item;
  const iconUUID = displaySettingsByAttribute?.item?.icon?.icon_uuid;

  if (iconUUID && iconUUID in AllIcons) {
    return AllIcons?.[iconUUID];
  }

  if (metadata?.action_timestamp) {
    return Schedule;
  }

  const mapping = {
    [ObjectTypeEnum.ACTION]: Lightning,
    [ObjectTypeEnum.APPLICATION]: NavDashboard,
    [ObjectTypeEnum.BLOCK]: BlockGeneric,
    [ObjectTypeEnum.CHAT]: Chat,
    [ObjectTypeEnum.CODE]: Code,
    [ObjectTypeEnum.DOCUMENT]: DocumentIcon,
    [ObjectTypeEnum.FILE]: FileIcon,
    [ObjectTypeEnum.FOLDER]: FolderOutline,
    [ObjectTypeEnum.GIT]: BranchAlt,
    [ObjectTypeEnum.PIPELINE]: PipelineV3,
    [ObjectTypeEnum.TRIGGER]: Schedule,
  };

  return mapping[item?.object_type];
};
