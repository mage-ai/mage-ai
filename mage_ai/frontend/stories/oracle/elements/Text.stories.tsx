import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Text, { TextProps } from '../../../oracle/elements/Text';
import ThemeBlock from '../../ThemeBlock';

export default {
  component: Text,
  title: 'Oracle/Elements/Text',
} as Meta;

const StylesTemplate: StoryFn<TextProps> = ({ ...props }) => (
  <ThemeBlock>
    <Text {...props} weightStyle={0}>Thin</Text>
    <Text {...props} weightStyle={2}>Light</Text>
    <Text {...props} weightStyle={3}>Regular</Text>
    <Text {...props} weightStyle={4}>Medium</Text>
    <Text {...props} weightStyle={6}>Bold</Text>
    <br />
    <Text {...props} monospace>Regular monospace</Text>
    <Text {...props} bold monospace>Bold monospace</Text>
  </ThemeBlock>
);
export const Styles = StylesTemplate.bind({});
Styles.args = {};

const SizesTemplate: StoryFn<TextProps> = ({ ...props }) => (
  <ThemeBlock>
    <Text {...props} small>Small</Text>
    <Text {...props}>Regular</Text>
    <Text {...props} large>Large</Text>
    <Text {...props} xlarge>X-Large</Text>
  </ThemeBlock>
);
export const Sizes = SizesTemplate.bind({});
Sizes.args = {};
