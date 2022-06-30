import React from 'react';
import { Meta, Story } from '@storybook/react';

import ThemeBlock from '../ThemeBlock';
import DependencyGraph, { DependencyGraphProps } from '@components/DependencyGraph';
import { BlockTypeEnum } from '@interfaces/BlockType';

export default {
  component: DependencyGraph,
  title: 'Components/DependencyGraph',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <DependencyGraph {...props} />
  </ThemeBlock>
);

const Template: Story<DependencyGraphProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

const samplePipeline = {
  name: 'Test Pipeline',
  uuid: 'pipeline_1',
  blocks: [
    {
      name: 'Data loader 1', // level 0
      type: BlockTypeEnum.DATA_LOADER,
      uuid: 'loader_1',
      upstream_blocks: [],
      downstream_blocks: [
        'exporter_1',
        'scratchpad_1',
        'transformer_1',
      ],
    },
    {
      name: 'Data exporter 1', // level 1
      type: BlockTypeEnum.DATA_EXPORTER,
      uuid: 'exporter_1',
      upstream_blocks: [
        'loader_1',
      ],
      downstream_blocks: [],
    },
    {
      name: 'Scratchpad 1', // level 1
      type: BlockTypeEnum.SCRATCHPAD,
      uuid: 'scratchpad_1',
      upstream_blocks: [
        'loader_1',
      ],
      downstream_blocks: [],
    },
    {
      name: 'Transformer 1', // level 1
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'transformer_1',
      upstream_blocks: [
        'loader_1',
      ],
      downstream_blocks: [
        'transformer_2',
        'transformer_3',
        'transformer_4',
      ],
    },
    {
      name: 'Transformer 2', // level 2
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'transformer_2',
      upstream_blocks: [
        'transformer_1',
      ],
      downstream_blocks: [],
    },
    {
      name: 'Transformer 3', // level 2
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'transformer_3',
      upstream_blocks: [
        'transformer_1',
      ],
      downstream_blocks: [
        'transformer_5',
      ],
    },
    {
      name: 'Transformer 4', // level 2
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'transformer_4',
      upstream_blocks: [
        'transformer_1',
      ],
      downstream_blocks: [],
    },
    {
      name: 'Transformer 5', // level 3
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'transformer_5',
      upstream_blocks: [
        'transformer_3',
      ],
      downstream_blocks: [
        'exporter_2',
      ],
    },
    {
      name: 'Data exporter 2', // level 4
      type: BlockTypeEnum.DATA_EXPORTER,
      uuid: 'exporter_2',
      upstream_blocks: [
        'transformer_5',
      ],
      downstream_blocks: [],
    },
  ],
};

Regular.args = {
  pipeline: samplePipeline,
  selectedBlock: { uuid: 'exporter_1' },
  setSelectedBlock: (uuid) => console.log('Selected block:', uuid),
};
