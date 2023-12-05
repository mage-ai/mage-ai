import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Button, { ButtonProps } from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import ThemeBlock from 'stories/ThemeBlock';
import { ArrowRight } from '@oracle/icons';

export default {
  component: Button,
  title: 'Oracle/Elements/Button',
} as Meta;

const TemplateWithTheme = ({ buttons, ...props }) => buttons ? (
  <ThemeBlock sideBySide>
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
const Template: StoryFn<ButtonProps> = (args) => <TemplateWithTheme {...args} />;

export const All = Template.bind({});
All.args = {
  buttons: [
    <Button>
      Regular
    </Button>,
    <Button basic>
      Basic
    </Button>,
    <Button primary>
      Primary
    </Button>,
    <Button success>
      Success
    </Button>,
    <Button selected>
      Selected
    </Button>,
    <Button disabled>
      Disabled
    </Button>,
    <Button large>
      Large
    </Button>,
    <Button small>
      Small
    </Button>,
    <Button beforeIcon={<ArrowRight />}>
      Before Icon
    </Button>,
    <Button afterIcon={<ArrowRight />}>
      After Icon
    </Button>,
    <Button iconOnly>
      <ArrowRight />
    </Button>,
    <Button basic iconOnly padding="0px">
      <ArrowRight />
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
  beforeIcon: <ArrowRight />,
  children: 'Button',
};

export const AfterIcon = Template.bind({});
AfterIcon.args = {
  ...Regular.args,
  afterIcon: <ArrowRight />,
  children: 'Button',
};

export const IconOnly = Template.bind({});
IconOnly.args = {
  ...Regular.args,
  children: <ArrowRight />,
  iconOnly: true,
};

export const Selected = Template.bind({});
Selected.args = {
  ...Regular.args,
  children: 'Selected Button',
  selected: true,
};
