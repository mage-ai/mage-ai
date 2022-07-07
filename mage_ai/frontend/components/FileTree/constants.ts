import dark from '@oracle/styles/themes/dark';
import { BaseIconProps } from '@oracle/icons/BaseIcon';
import { FileFill, RoundedSquare } from '@oracle/icons';
import { ThemeType } from '@oracle/styles/themes/constants';
import { getBlockFilename } from './utils';

export type FileNodeProps = {
  textColor?: string;
  iconType?: (props: BaseIconProps) => JSX.Element;
  iconColor?: string;
};

export type FileNodeType = {
  children?: FileNodeType[];
  collapsed?: boolean;
  name: string;
  selected?: boolean;
};

export enum ReservedFolderEnum {
  DATA_LOADERS = 'data_loaders',
  DATA_EXPORTERS = 'data_exporters',
  GLOBAL_VARIABLES = 'global_variables',
  PIPELINES = 'pipelines',
  SCRATCHPADS = 'scratchpads',
  TRANSFORMERS = 'transformers',
}

export enum SpecialFileEnum {
  INIT_PY = '__init__.py',
}

export const getFileNodeColor: (
  path: string[],
  themeType: ThemeType
) => FileNodeProps = (path, themeType) => {
  const nodeName = getBlockFilename(path);
  if (nodeName === SpecialFileEnum.INIT_PY) {
    return {
      iconColor: (themeType?.monotone || dark.monotone).grey500,
      iconType: FileFill,
    };
  }

  // style reserved folder names 
  if (path.length === 2) {
    const mapping = {
      [ReservedFolderEnum.DATA_LOADERS]: {
        iconColor: (themeType?.chart || dark.chart).button1,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).button1,
      },
      [ReservedFolderEnum.DATA_EXPORTERS]: {
        iconColor: (themeType?.chart || dark.chart).button2,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).button2,
      },
      [ReservedFolderEnum.GLOBAL_VARIABLES]: {
        iconColor: (themeType?.chart || dark.chart).button3,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).button3,
      },
      [ReservedFolderEnum.PIPELINES]: {
        iconColor: (themeType?.chart || dark.chart).button4,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).button4,
      },
      [ReservedFolderEnum.SCRATCHPADS]: {
        iconColor: (themeType?.chart || dark.chart).button5,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).button5,
      },
      [ReservedFolderEnum.TRANSFORMERS]: {
        iconColor: (themeType?.chart || dark.chart).primary,
        iconType: RoundedSquare,
        textColor: (themeType?.chart || dark.chart).primary,
      },
    };
  
    return mapping[nodeName];
  }
};
