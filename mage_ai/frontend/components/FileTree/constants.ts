import dark from '@oracle/styles/themes/dark';
import { BaseIconProps } from '@oracle/icons/BaseIcon';
import { FileFill, RoundedSquare } from '@oracle/icons';
import { ThemeType } from '@oracle/styles/themes/constants';

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

export const TEST_FILE_TREE: FileNodeType[] = [
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
  DATA_EXPORTERS = 'data_exporters',
  GLOBAL_VARIABLES = 'global_variables',
  PIPELINES = 'pipelines',
  SCRATCHPADS = 'scratchpads',
  TRANSFORMERS = 'transformers',
}

export const getFileNodeColor: (
  path: string[],
  themeType: ThemeType
) => FileNodeProps = (path, themeType) => {
  const nodeName = path.at(-1);
  
  if (nodeName === '__init__.py') {
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
