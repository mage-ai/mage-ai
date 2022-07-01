import BaseIcon from '@oracle/icons/BaseIcon';
import dark from '@oracle/styles/themes/dark';
import { RoundedSquare } from '@oracle/icons';
import { ThemeType } from '@oracle/styles/themes/constants';

export type FileTreeNodeStyle = {
  color?: string;
  icon?: typeof BaseIcon;
};

export type FileTreeNode = {
  children?: FileTreeNode[];
  collapsed?: boolean;
  name: string;
  selected?: boolean;
};

export const TEST_FILE_TREE: FileTreeNode[] = [
  {
    children: [
      {
        name: '__init__.py',
      },
      {
        name: 'requirements.txt',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            children: [
              {
                name: '__init__.py',
              },
              {
                name: 'metadata.json',
              },
              {
                name: 'requirements.txt',
              },
            ],
            name: 'prepare_sales_data',
          },
        ],
        name: 'pipelines',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'upload_to_s3.py',
          },
        ],
        name: 'exporters',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'sales_data.py',
          },
        ],
        name: 'data_loaders',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'summary_statistics.py',
          },
        ],
        name: 'global_variables',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'average_purchase_price.py',
          },
        ],
        name: 'transformers',
      },
      {
        children: [],
        name: 'scratchpad',
      },
    ],
    name: 'demo_project',
  },
];

export enum ReservedFolderEnum {
  DATA_LOADERS = 'data_loaders',
  EXPORTERS = 'exporters',
  GLOBAL_VARIABLES = 'global_variables',
  PIPELINES = 'pipelines',
  SCRATCHPAD = 'scratchpad',
  TRANSFORMERS = 'transformers',
}

export const getFileNodeColor = (
  nodeName: ReservedFolderEnum,
  themeType: ThemeType,
) => {
  const mapping = {
    [ReservedFolderEnum.DATA_LOADERS]: {
      color: (themeType?.chart || dark.chart).button1,
      icon: RoundedSquare,
    },
    [ReservedFolderEnum.EXPORTERS]: {
      color: (themeType?.chart || dark.chart).button2,
      icon: RoundedSquare,
    },
    [ReservedFolderEnum.GLOBAL_VARIABLES]: {
      color: (themeType?.chart || dark.chart).button3,
      icon: RoundedSquare,
    },
    [ReservedFolderEnum.PIPELINES]: {
      color: (themeType?.chart || dark.chart).button4,
      icon: RoundedSquare,
    },
    [ReservedFolderEnum.SCRATCHPAD]: {
      color: (themeType?.chart || dark.chart).button5,
      icon: RoundedSquare,
    },
    [ReservedFolderEnum.TRANSFORMERS]: {
      color: (themeType?.chart || dark.chart).primary,
      icon: RoundedSquare,
    },
  };

  return mapping[nodeName];
};
