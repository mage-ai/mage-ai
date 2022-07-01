import React from 'react';
import { Meta, Story } from '@storybook/react';

import FileTree, { FileTreeProps } from '@components/FileTree';
import ThemeBlock from '../../ThemeBlock';
import { TEST_FILE_TREE } from '@components/FileTree/constants';

export default {
  component: FileTree,
  title: 'Components/Panels/FileTree',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <FileTree {...props} />
  </ThemeBlock>
);

const Template: Story<FileTreeProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

Regular.args = {
  tree: TEST_FILE_TREE,
};
