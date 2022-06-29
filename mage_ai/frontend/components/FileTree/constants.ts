import BaseIcon from '@oracle/icons/BaseIcon';

export type FileTreeNodeStyle = {
  color?: string;
  icon?: typeof BaseIcon;
};

export type FileTreeNode = {
  children?: FileTreeNode[];
  expanded?: boolean;
  name: string;
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
            name: 'sales_data.py',
          },
        ],
        name: 'exporters',
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
  },
  exporters: {
    color: 'gold',
  },
  global_variables: {
    color: 'blue',
  },
  pipelines: {
    color: 'pink',
  },
  scratchpad: {
    color: 'brown',
  },
  transformers: {
    color: 'purple',
  },
};
