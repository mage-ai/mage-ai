import React, { useEffect, useState, useCallback } from 'react';

import FlyoutMenu from '@oracle/components/FlyoutMenu';
import styled from 'styled-components';
import { UNIT } from '@oracle/styles/units/spacing';
import { HEADER_HEIGHT, HEADER_Z_INDEX } from '@components/constants';

export type ContextMenuProps = {
  children: any;
  context: ContextMenuEnum;
};

export enum ContextMenuEnum {
  FILE_BROWSER,
}

const ContainerStyle = styled.div<{
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  width?: number;
}>`
  position: fixed;
  z-index: ${HEADER_Z_INDEX + 100};

  ${props => typeof props.left !== 'undefined' && `
    left: ${(props.left) + 5}px;
  `}

  ${props => typeof props.right !== 'undefined' && `
    right: ${(props.right)}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${(props.top)}px;
  `}

  ${props => typeof props.bottom !== 'undefined' && `
    bottom: ${(props.bottom)}px;
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
  children,
  context,
}: ContextMenuProps) {
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.addEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  });

  const handleClick = useCallback((e) => {
    e.preventDefault();
    setVisible(false);
  }, [
    setVisible,
  ]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setAnchorPoint({ x: e.pageX, y: e.pageY });
    setVisible(true);
  }, [
    setAnchorPoint,
    setVisible,
  ]);

  const contextItems = {
    [ContextMenuEnum.FILE_BROWSER]: [
      {
        label: () => 'Delete',
        onClick: () => console.log('delete'),
        uuid: 'delete block file',
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
          items={contextItems[context]}
          open={visible}
          parentRef={undefined}
          uuid="ContextMenu"
        />
      </ContainerStyle>
      {children}
    </>
  );
}

export default ContextMenu;
