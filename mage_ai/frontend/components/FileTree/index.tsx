import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { File } from '@oracle/icons';
import { FileTreeNode, NODE_STYLE_MAPPING } from './constants';

export type FileTreeProps = {
  tree: FileTreeNode[];
};

function FileTree({
  tree,
}: FileTreeProps) {

  let depth = 0;

  const buildTreeEl = (tree: FileTreeNode[]) => {
    depth++;
    const el = tree.map(({ name, children }) => {
      const {
        color = 'black',
        icon: FileTreeIcon = File,
      } = NODE_STYLE_MAPPING[name] || {};
      return (
        <>
          {
            <Flex alignItems="center">
              <Spacing mr={depth * 2} />
              <FileTreeIcon />&nbsp;
              <Text
                color={color}
                monospace
              >
                {name}
              </Text>
            </Flex>
          }
          {children && buildTreeEl(children)}
        </>
      );
    });
    depth--;
    return el;
  };

  return (
    <FlexContainer flexDirection="column">
      {buildTreeEl(tree)}
    </FlexContainer>
  );
}

export default FileTree;
