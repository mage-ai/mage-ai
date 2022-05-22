import React from 'react';
import { Meta, Story } from '@storybook/react';

import Button, { ButtonProps } from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import ThemeBlock from 'stories/ThemeBlock';
import { Add } from '@oracle/icons';

export default {
  title: 'Oracle/Elements/Button',
  component: Button,
} as Meta;

const TemplateWithTheme = ({ buttons, ...props }) => buttons ? (
  <ThemeBlock>
    {React.Children.map(buttons, child => (
      <Spacing mb={3}>
        {React.cloneElement(child, {
          ...props,
          ...child.props,
        })}
      </Spacing>
    ))}
  </ThemeBlock>
) : (
  <ThemeBlock>
    <Button {...props} />
  </ThemeBlock>
);

// @ts-ignore
const Template: Story<ButtonProps> = (args) => <TemplateWithTheme {...args} />;

export const All = Template.bind({});
All.args = {
  buttons: [
    <Button primary>
      Primary
    </Button>,
    <Button>
      Regular
    </Button>,
    <Button selected>
      Selected
    </Button>,
    <Button default>
      Default
    </Button>,
    <Button basic>
      Basic
    </Button>,
    <Button danger>
      Danger
    </Button>,
    <Button secondary>
      Secondary
    </Button>,
    <Button disabled>
      Disabled
    </Button>,
  ],
};

export const Regular = Template.bind({});
Regular.args = {
  children: 'Button',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  disabled: true,
};

export const Primary = Template.bind({});
Primary.args = {
  ...Regular.args,
  children: 'Primary Button',
  primary: true,
};

export const Secondary = Template.bind({});
Secondary.args = {
  ...Regular.args,
  children: 'Secondary Button',
  secondary: true,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Regular.args,
  children: 'Danger Button',
  danger: true,
};

export const Basic = Template.bind({});
Basic.args = {
  ...Regular.args,
  children: 'Basic Button',
  basic: true,
};

export const Default = Template.bind({});
Default.args = {
  ...Regular.args,
  children: 'Default Button',
  default: true,
};

export const BeforeIcon = Template.bind({});
BeforeIcon.args = {
  ...Regular.args,
  children: 'Button',
  beforeIcon: <Add />,
};

export const AfterIcon = Template.bind({});
AfterIcon.args = {
  ...Regular.args,
  children: 'Button',
  afterIcon: <Add />,
};

export const IconOnly = Template.bind({});
IconOnly.args = {
  ...Regular.args,
  children: <Add />,
  iconOnly: true,
};

export const Large = Template.bind({});
Large.args = {
  ...Regular.args,
  children: 'Large Button',
  large: true,
  primary: true,
};

export const Compact = Template.bind({});
Compact.args = {
  ...Regular.args,
  children: 'Compact Button',
  compact: true,
  primary: true,
};

export const Selected = Template.bind({});
Selected.args = {
  ...Regular.args,
  children: 'Selected Button',
  selected: true,
};

export const Loading = Template.bind({});
Loading.args = {
  ...Regular.args,
  children: 'Loading Button',
  loading: true,
};

export const Pill = Template.bind({});
Pill.args = {
  ...Regular.args,
  children: 'Pill Button',
  pill: true,
};

export const PillIconOnly = Template.bind({});
PillIconOnly.args = {
  ...Regular.args,
  children: <Add />,
  iconOnly: true,
  pill: true,
};
