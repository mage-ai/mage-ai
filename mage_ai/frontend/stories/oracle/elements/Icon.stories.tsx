import React from 'react';
import { Meta, Story } from '@storybook/react';
import { UNIT } from '@oracle/styles/units/spacing';
import ThemeBlock from 'stories/ThemeBlock';

import {
  Add,
  AlertCircle,
  ApplyAction,
  ArrowDown,
  ArrowRight,
  Check,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  // PreviewOpen,
  // PreviewHidden,
  Remove,
  Report,
  Sort,
  // ViewCode,
} from '@oracle/icons';
const ICONS = [
  Add,
  AlertCircle,
  ApplyAction,
  ArrowDown,
  ArrowRight,
  Check,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  // PreviewOpen,
  // PreviewHidden,
  Remove,
  Report,
  Sort,
  // ViewCode,
]

const Icons = () => (
  <>
    {ICONS.map(Icon => (
      <ThemeBlock
        // @ts-ignore
        key={Icon.displayName}
        reducedPadding
        // @ts-ignore
        title={Icon.displayName}
      >
        <Icon />
      </ThemeBlock>
    ))}
  </>
);

export default {
  component: Icons,
  title: 'Oracle/Icons',
} as Meta;

const Template: Story = () => <Icons />;

export const Main = Template.bind({});
