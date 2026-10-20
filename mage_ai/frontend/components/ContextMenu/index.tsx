import React, { useEffect, useState, useCallback } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import styled from 'styled-components';
import { FileContextEnum } from '@components/FileBrowser';
import { HEADER_HEIGHT, HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@oracle/styles/units/spacing';

export type ContextMenuSharedProps = {
  deleteBlockFile?: (b: BlockType) => void;
  deleteWidget?: (b: BlockType) => void;
};

export type ContextMenuProps = {
  areaRef: any;
  children: any;
  enableContextItem: boolean;
  type: ContextMenuEnum;
} & ContextMenuSharedProps;

export enum ContextMenuEnum {
  FILE_BROWSER = 'file_browser',
}

export interface ContextAreaProps {
  setContextItem?: (item: ContextItemType) => void;
}

export type ContextItemType = {
  data?: any;
  type: any;
};

const ContainerStyle = styled.div<{
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
  width?: number;
}>`
  position: fixed;
  z-index: ${HEADER_Z_INDEX + 100};

  ${props => typeof props.left !== 'undefined' && `
    left: ${props.left + 5}px;
  `}

  ${props => typeof props.right !== 'undefined' && `
    right: ${props.right}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${props.top}px;
  `}

  ${props => typeof props.bottom !== 'undefined' && `
    bottom: ${props.bottom}px;
  `}

  ${props => typeof props.top === 'undefined' && typeof props.bottom === 'undefined' && `
    top: ${HEADER_HEIGHT - (UNIT * 1)}px;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => !props.width && `
    min-width: ${UNIT * 33}px;
  `}
`;

function ContextMenu({
  areaRef,
  children,
  deleteBlockFile,
  deleteWidget,
  enableContextItem,
  type,
}: ContextMenuProps) {
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [contextItem, setContextItem] = useState<ContextItemType>({} as ContextItemType);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const handleClick = useCallback((e) => {
    setVisible(false);
  }, [
    setVisible,
  ]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (areaRef.current.contains(e.target)) {
      if (!enableContextItem) {
        e.preventDefault();
      }
      setAnchorPoint({ x: e.pageX, y: e.pageY });
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [
    areaRef,
    enableContextItem,
    setAnchorPoint,
    setVisible,
  ]);

  const contextItems = {
    [FileContextEnum.BLOCK_FILE]: [
      {
        label: () => 'Delete',
        onClick: () => {
          const { block } = contextItem.data;
          if (!block) {
            return;
          }
          if (block.type === BlockTypeEnum.CHART) {
            deleteWidget(block);
          } else {
            deleteBlockFile(block);
          }
        },
        uuid: 'delete_block_file',
      },
    ],
  };

  return (
    <>
      <ContainerStyle
        left={anchorPoint.x}
        top={anchorPoint.y}
      >
        <FlyoutMenu
          items={contextItems[enableContextItem ? contextItem.type : type]}
          open={visible}
          parentRef={undefined}
          uuid="ContextMenu"
        />
      </ContainerStyle>

      {React.Children.map(children, child => (
        React.cloneElement(child, { setContextItem })
      ))}
    </>
  );
}

export default ContextMenu;
