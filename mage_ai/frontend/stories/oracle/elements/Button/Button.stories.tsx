import React from 'react';
import { Meta, Story } from '@storybook/react';

import Button, { ButtonProps } from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import ThemeBlock from 'stories/ThemeBlock';
import { Add } from '@oracle/icons';

export default {
  component: Button,
  title: 'Oracle/Elements/Button',
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
    <Button>
      Regular
    </Button>,
    <Button primary>
      Primary
    </Button>,
    <Button selected>
      Selected
    </Button>,
    <Button disabled>
      Disabled
    </Button>,
    <Button beforeIcon={<Add />}>
      Before Icon
    </Button>,
    <Button afterIcon={<Add />}>
      After Icon
    </Button>,
    <Button iconOnly={true}>
      <Add />
    </Button>
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

export const Selected = Template.bind({});
Selected.args = {
  ...Regular.args,
  children: 'Selected Button',
  selected: true,
};