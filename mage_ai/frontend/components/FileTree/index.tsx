import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowRight, File, Folder } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { useState } from 'react';
import { FileTreeNode, NODE_STYLE_MAPPING } from './constants';

export type FileTreeProps = {
  tree: FileTreeNode[];
};

function FileTree({
  tree: initialTree,
}: FileTreeProps) {
  const [tree, setTree] = useState(initialTree);

  const toggleFolder = (name: string, depth: number) => {
    let searchDepth = 0;
    const updateExpanded = (subtree: FileTreeNode) => {
    if (subtree?.name === name && searchDepth === depth) {
        subtree.collapsed = !subtree.collapsed;
        return;
      }

      searchDepth++;
      subtree.children?.forEach(childTree => updateExpanded(childTree));
      searchDepth--;
    };

    const treeCopy = { children: JSON.parse(JSON.stringify(tree)), name: 'root' };
    updateExpanded(treeCopy);
    setTree(treeCopy.children);
  };

  const toggleFolderHandler = (name, depth) => () => toggleFolder(name, depth);

  let depth = 0;
  const buildTreeEl = (tree: FileTreeNode[]) => {
    depth++;
    const el = tree.map(({ name, children, collapsed, selected }) => {
      const {
        color = 'black',
        icon: FileTreeIcon = children ? Folder : File,
      } = NODE_STYLE_MAPPING[name] || {};
      return (
        <>
          <Flex alignItems="center">
            <Spacing mr={children ? `${depth * 2 * UNIT - 12}px` : `${depth * 2 * UNIT}px`} />
            <Link
              noColor
              noHoverUnderline
              noOutline
              onClick={toggleFolderHandler(name, depth)}
            >
              <Spacing py={`${0.75 * UNIT}px`}>
                <FlexContainer alignItems="center">
                  {children && (
                    <Button
                      basic
                      iconOnly
                      noPadding
                      onClick={() => collapsed = true}
                      title="Expand folder"
                    >
                      {collapsed ? <ArrowRight /> : <ArrowDown />}
                    </Button>
                  )}
                  &nbsp;
                  <FileTreeIcon fill={color} />
                  &nbsp;
                  <Text
                    color={selected ? 'white' : color}
                    monospace
                  >
                    {name}
                  </Text>
                </FlexContainer>

              </Spacing>
            </Link>
          </Flex>
          {children && !collapsed && buildTreeEl(children)}
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
