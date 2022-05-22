import React from 'react';
import { Meta, Story } from '@storybook/react';

import Button from '@oracle/elements/Button';
import ButtonGroup, { ButtonGroupProps } from '@oracle/elements/Button/ButtonGroup';
import ThemeBlock from 'stories/ThemeBlock';
import { CaretDown } from '@oracle/icons';
import { Filter, Formula, Grouping, More, Sort } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

export default {
  title: 'Oracle/Elements/ButtonGroup',
  component: ButtonGroup,
} as Meta;

const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <ButtonGroup {...props}>
      {children}
    </ButtonGroup>
  </ThemeBlock>
);

const Template: Story<ButtonGroupProps> = (args) => <TemplateWithTheme {...args} />;

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


export const Pill = Template.bind({});
Pill.args = {
  ...Regular.args,
  pill: true,
};

export const Combo = Template.bind({});
Combo.args = {
  ...Regular.args,
  children: [
    <Button primary>
      Button 1
    </Button>,
    <Button iconOnly primary>
      <CaretDown />
    </Button>
  ],
};

export const Condensed = Template.bind({});
Condensed.args = {
  ...Combo.args,
  condensed: true,
};

export const IconsOnly = Template.bind({});
IconsOnly.args = {
  ...Combo.args,
  children: [
    <Button iconOnly>
      <Filter size={UNIT * 3} />
    </Button>,
    <Button iconOnly>
      <Grouping size={UNIT * 3} />
    </Button>,
    <Button iconOnly>
      <Sort size={UNIT * 3} />
    </Button>,
    <Button iconOnly>
      <Formula size={UNIT * 3} />
    </Button>,
    <Button iconOnly>
      <More size={UNIT * 3} />
    </Button>,
  ],
  condensed: true,
};
