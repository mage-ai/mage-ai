import React from 'react';
import { Meta, Story } from '@storybook/react';
import ThemeBlock from 'stories/ThemeBlock';

import {
  Action,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  PreviewHidden,
  PreviewOpen,
  Report,
  Search,
  Sort,
} from '@oracle/icons';
const ICONS = [
  AlertCircle,
  Action,
  ArrowDown,
  ArrowRight,
  Check,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  File,
  Graph,
  Pipeline,
  PreviewHidden,
  PreviewOpen,
  Report,
  Search,
  Sort,
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
