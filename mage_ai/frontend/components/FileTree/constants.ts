import BaseIcon from '@oracle/icons/BaseIcon';
import { Rectangle } from '@oracle/icons';

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
    ],
    name: 'demo_project',
  },
];

// TODO fill in as we go
export const FILE_EXT_ICON_MAPPING = {
  py: {/* black file icon */},
};

// TODO fill in as we go
// TODO replace with actual theme colors
export const NODE_STYLE_MAPPING = {
  data_loaders: {
    color: 'blue',
    icon: Rectangle,
  },
  exporters: {
    color: 'gold',
    icon: Rectangle,
  },
  global_variables: {
    color: 'green',
    icon: Rectangle,
  },
  pipelines: {
    color: 'magenta',
    icon: Rectangle,
  },
  scratchpad: {
    color: 'brown',
    icon: Rectangle,
  },
  transformers: {
    color: 'purple',
    icon: Rectangle,
  },
};
