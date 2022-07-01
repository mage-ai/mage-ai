import React, { useContext } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import styled, { ThemeContext } from 'styled-components';
import { ArrowDown, ArrowRight, File, Folder } from '@oracle/icons';
import { FileTreeNode, getFileNodeColor } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { useState } from 'react';
import { equals } from '@utils/array';

export type FileTreeProps = {
  tree: FileTreeNode[];
};

function FileTree({
  tree: initialTree,
}: FileTreeProps) {
  const themeContext = useContext(ThemeContext);
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

  type FileNodeProps = {
    highlighted?: boolean;
  };

  const FileNodeStyle = styled.div<FileNodeProps>`
    align-items: center;
    display: flex;

    ${(props: any) => props.highlighted && `
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    `}

    ${(props: any) => `
      &:hover {
        background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
      }
    `}
  `;

  let depth = 0;
  const path: string[] = [];
  const buildTreeEl = (tree: FileTreeNode[]) => {
    depth++;
    const el = tree.map(({ name, children, collapsed }) => {
      path.push(name);
      const {
        color,
        icon: FileTreeIcon = children ? Folder : File,
      } = getFileNodeColor(name, themeContext) || {};

      const fileNodeEl = (
        <>
          <FileNodeStyle highlighted={equals(path, selectedPath)}>
            <Spacing mr={children ? `${depth * 2 * UNIT - 12}px` : `${depth * 2 * UNIT}px`} />
            <Link
              fullWidth
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
          </FileNodeStyle>
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
