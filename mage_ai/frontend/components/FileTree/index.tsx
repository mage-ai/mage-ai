import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowRight, File, Folder } from '@oracle/icons';
import { FileTreeNode, NODE_STYLE_MAPPING } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { useState } from 'react';
import { equals } from '@utils/array';

export type FileTreeProps = {
  tree: FileTreeNode[];
};

function FileTree({
  tree: initialTree,
}: FileTreeProps) {
  type TreeOperation = true | false | 'toggle';

  const [tree, setTree] = useState(initialTree);
  const [selectedPath, setSelectedPath] = useState([]);

  const setTreeState = (path: string[], prop: string, value: TreeOperation) => {
    const searchPath: string[] = [];
    const updateTree = (subtree: FileTreeNode) => {
      if (equals(path, searchPath)) {
        subtree[prop] = value === 'toggle' ? !subtree[prop] : value;
        return;
      }

      subtree.children?.forEach(childTree => {
        searchPath.push(childTree.name);
        updateTree(childTree);
        searchPath.pop();
      });
    };

    const treeCopy = { children: JSON.parse(JSON.stringify(tree)), name: 'root' };
    updateTree(treeCopy);
    setTree(treeCopy.children);
  };

  const toggleFolder = (path: string[]) => {
    setTreeState([...path], 'collapsed', 'toggle');
    setSelectedPath([...path]);
  };
  
  const selectFile = (path: string[]) => setSelectedPath([...path]);

  const fileTreeHandler = (path, isFolder) => (e) => {
    e.preventDefault();
    return isFolder ? toggleFolder(path) : selectFile(path);
  };

  let depth = 0;
  const path: string[] = [];
  const buildTreeEl = (tree: FileTreeNode[]) => {
    depth++;
    const el = tree.map(({ name, children, collapsed }) => {
      path.push(name);
      const {
        color,
        icon: FileTreeIcon = children ? Folder : File,
      } = NODE_STYLE_MAPPING[name] || {};

      const fileNodeEl = (
        <>
          <Flex alignItems="center">
            <Spacing mr={children ? `${depth * 2 * UNIT - 12}px` : `${depth * 2 * UNIT}px`} />
            <Link
              noColor
              noHoverUnderline
              noOutline
              onClick={fileTreeHandler([...path], !!children)}
            >
              <Spacing py={`${0.75 * UNIT}px`}>
                <FlexContainer alignItems="center">
                  {children && (
                    collapsed ? <ArrowRight /> : <ArrowDown />
                  )}
                  &nbsp;
                  <FileTreeIcon fill={color} />
                  &nbsp;
                  <Text
                    monospace
                    color={color}
                    muted={!equals(path, selectedPath)}
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

      path.pop();
      return fileNodeEl;
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
