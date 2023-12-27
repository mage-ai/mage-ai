import * as AllIcons from '@oracle/icons';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { CommandCenterItemType, CommandCenterTypeEnum } from '@interfaces/CommandCenterType';
import {
  BlockGeneric,
  File as FileIcon,
  NavDashboard,
  Lightning,
  PipelineV3,
  Schedule,
} from '@oracle/icons';

export function getIcon(item: CommandCenterItemType) {
  const { icon } = item;

  if (icon && icon in AllIcons) {
    return AllIcons?.[icon];
  }

  const mapping = {
    [CommandCenterTypeEnum.ACTION]: Lightning,
    [CommandCenterTypeEnum.APPLICATION]: NavDashboard,
    [CommandCenterTypeEnum.BLOCK]: BlockGeneric,
    [CommandCenterTypeEnum.FILE]: FileIcon,
    [CommandCenterTypeEnum.PIPELINE]: PipelineV3,
    [CommandCenterTypeEnum.TRIGGER]: Schedule,
  };

  return mapping[item?.type];
};
