import {
  CommandCenterTypeEnum,
} from '@interfaces/CommandCenterType';
import {
  BlockGeneric,
  File as FileIcon,
  NavDashboard,
  Lightning,
  PipelineV3,
  Schedule,
} from '@oracle/icons';

export const ICONS_MAPPING = {
  [CommandCenterTypeEnum.ACTION]: Lightning,
  [CommandCenterTypeEnum.APPLICATION]: NavDashboard,
  [CommandCenterTypeEnum.BLOCK]: BlockGeneric,
  [CommandCenterTypeEnum.FILE]: FileIcon,
  [CommandCenterTypeEnum.PIPELINE]: PipelineV3,
  [CommandCenterTypeEnum.TRIGGER]: Schedule,
};
