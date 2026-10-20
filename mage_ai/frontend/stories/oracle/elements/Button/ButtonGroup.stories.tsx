import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Button from '@oracle/elements/Button';
import ButtonGroup, { ButtonGroupProps } from '@oracle/elements/Button/ButtonGroup';
import ThemeBlock from 'stories/ThemeBlock';
import { ArrowDown, Menu, Graph, Check } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

export default {
  component: ButtonGroup,
  title: 'Oracle/Elements/ButtonGroup',
} as Meta;

const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <ButtonGroup {...props}>
      {children}
    </ButtonGroup>
  </ThemeBlock>
);

const Template: StoryFn<ButtonGroupProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: [
    <Button>
      Button 1
    </Button>,
    <Button>
      Button 2
    </Button>,
    <Button>
      Button 3
    </Button>,
    <Button>
      Button 4
    </Button>,
  ],
};

export const Combo = Template.bind({});
Combo.args = {
  ...Regular.args,
  children: [
    <Button primary>
      Button 1
    </Button>,
    <Button iconOnly primary>
      <ArrowDown />
    </Button>,
  ],
};

export const Divided = Template.bind({});
Divided.args = {
  ...Combo.args,
  divider: true,
};

export const IconsOnly = Template.bind({});
IconsOnly.args = {
  ...Combo.args,
  children: [
    <Button iconOnly>
      <Menu />
    </Button>,
    <Button iconOnly>
      <Graph />
    </Button>,
    <Button iconOnly>
      <ArrowDown />
    </Button>,
    <Button iconOnly>
      <Check />
    </Button>,
  ],
};
