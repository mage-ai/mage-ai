import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Link, { LinkProps } from '@oracle/elements/Link';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Link,
  title: 'Oracle/Elements/Link',
} as Meta;

// eslint-disable-next-line react/prop-types
const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <Link {...props}>
      {children}
    </Link>
  </ThemeBlock>
);

// @ts-ignore
const Template: StoryFn<LinkProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  autoHeight: false,
  block: false,
  bold: false,
  children: 'Link',
  disabled: false,
  href: 'https://www.mage.ai',
  inline: false,
  muted: false,
  noHoverUnderline: false,
  onClick: null,
  openNewWindow: true,
  preventDefault: false,
  sameColorAsText: false,
  small: false,
  tabIndex: 0,
  target: null,
  underline: false,
};

export const Small = Template.bind({});
Small.args = {
  ...Regular.args,
  children: 'Link Small',
  small: true,
};

export const Bold = Template.bind({});
Bold.args = {
  ...Regular.args,
  bold: true,
  children: 'Link Bold',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  children: 'Link Disabled',
  disabled: true,
};

export const Muted = Template.bind({});
Muted.args = {
  ...Regular.args,
  children: 'Link Muted',
  muted: true,
};

export const NoHoverUnderline = Template.bind({});
NoHoverUnderline.args = {
  ...Regular.args,
  children: 'Link no underline when hovering',
  noHoverUnderline: true,
};

export const sameColorAsText = Template.bind({});
sameColorAsText.args = {
  ...Regular.args,
  children: 'Link has same color as text',
  sameColorAsText: true,
};

export const Underline = Template.bind({});
Underline.args = {
  ...Regular.args,
  children: 'Link Underline',
  underline: true,
};
