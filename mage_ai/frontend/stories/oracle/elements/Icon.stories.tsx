import React from 'react';
import { Meta, Story } from '@storybook/react';
import ThemeBlock from 'stories/ThemeBlock';

import {
  AlertCircle,
  ApplyAction,
  ArrowDown,
  ArrowRight,
  Check,
  Close,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  // PreviewOpen,
  // PreviewHidden,
  Report,
  Search,
  Sort,
  // ViewCode,
} from '@oracle/icons';
const ICONS = [
  AlertCircle,
  ApplyAction,
  ArrowDown,
  ArrowRight,
  Check,
  Close,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  // PreviewOpen,
  // PreviewHidden,
  Report,
  Search,
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
