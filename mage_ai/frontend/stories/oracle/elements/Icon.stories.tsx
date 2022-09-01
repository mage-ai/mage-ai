import React from 'react';
import { Meta, Story } from '@storybook/react';

import ThemeBlock from '../../ThemeBlock';
import {
  Action,
  Add,
  AlertCircle,
  Alphabet,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Binary,
  BlocksSeparated,
  BlocksStacked,
  CalendarDate,
  CaretDown,
  CaretRight,
  Categories,
  Category,
  Chat,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  Email,
  Expand,
  File as FileIcon,
  FileFill as FilledFileIcon,
  Folder,
  Graph,
  GraphWithNodes,
  IDLetters,
  Info,
  Input,
  Insights,
  MapPin,
  Menu,
  MultiShare,
  NavData,
  NavGraph,
  NavReport,
  NavTree,
  NewBlock,
  NumberHash,
  NumberWithDecimalHash,
  Pause,
  Phone,
  Pipeline,
  PipelineV2,
  PlayButton,
  PreviewHidden,
  PreviewOpen,
  Report,
  RoundedSquare,
  Schedule,
  Search,
  Sort,
  Stack,
  Switch,
  TodoList,
  Trash,
} from '@oracle/icons';
import EmptyCharts from '@oracle/icons/custom/EmptyCharts';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';

const ICONS = [
  Action,
  Add,
  AlertCircle,
  Alphabet,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUp,
  Binary,
  BlocksSeparated,
  BlocksStacked,
  CalendarDate,
  CaretDown,
  CaretRight,
  Categories,
  Category,
  Chat,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Code,
  Column,
  Copy,
  Cursor,
  Edit,
  Email,
  EmptyCharts,
  Expand,
  FileIcon,
  FilledFileIcon,
  Folder,
  Graph,
  GraphWithNodes,
  IDLetters,
  Info,
  Input,
  Insights,
  Mage8Bit,
  MapPin,
  Menu,
  MultiShare,
  NavData,
  NavGraph,
  NavReport,
  NavTree,
  NewBlock,
  NumberHash,
  NumberWithDecimalHash,
  Pause,
  Phone,
  Pipeline,
  PipelineV2,
  PlayButton,
  PreviewHidden,
  PreviewOpen,
  Report,
  RoundedSquare,
  Schedule,
  Search,
  Sort,
  Stack,
  Switch,
  TodoList,
  Trash,
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
