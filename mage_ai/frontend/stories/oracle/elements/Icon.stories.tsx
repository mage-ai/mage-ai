import React from 'react';
import { Meta, Story } from '@storybook/react';
import ThemeBlock from 'stories/ThemeBlock';

import {
  Action,
  AlertCircle,
  Alphabet,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Binary,
  CalendarDate,
  Categories,
  Category,
  Chat,
  Check,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  Email,
  File as FileIcon,
  Graph,
  IDLetters,
  Input,
  Insights,
  MapPin,
  Menu,
  MultiShare,
  NumberHash,
  NumberWithDecimalHash,
  Phone,
  Pipeline,
  PreviewHidden,
  PreviewOpen,
  Report,
  Search,
  Sort,
  Switch,
} from '@oracle/icons';

const ICONS = [
  Action,
  AlertCircle,
  Alphabet,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Binary,
  CalendarDate,
  Categories,
  Category,
  Chat,
  Check,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  Email,
  FileIcon,
  Graph,
  IDLetters,
  Input,
  Insights,
  MapPin,
  Menu,
  MultiShare,
  NumberHash,
  NumberWithDecimalHash,
  Phone,
  Pipeline,
  PreviewHidden,
  PreviewOpen,
  Report,
  Search,
  Sort,
  Switch,
];

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
