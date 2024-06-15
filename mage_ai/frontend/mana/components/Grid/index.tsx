import React from 'react';

import styles from '@styles/scss/components/Grid/Grid.module.scss';
import { ElementType, extractProps } from '../../shared/types';
import { styleClassNames } from '../../shared/utils';

type GridProps = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[];
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  uuid?: string;
} & ElementType & {
    [key: string]: any;
  };

function Grid(
  { children, className, onClick, onContextMenu, style, uuid, ...props }: GridProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const classNames = styleClassNames(
    styles,
    [styles['grid'], uuid ? styles['grid-mana'] : '', className || ''],
    // @ts-ignore
    {
      className,
      uuid,
      ...props,
    },
  );

  return (
    <div
      {...extractProps(props)}
      className={classNames}
      onClick={onClick}
      onContextMenu={onContextMenu}
      ref={ref}
      style={style}
    >
      {children && (children as React.ReactNode)}
    </div>
  );
}

export default React.forwardRef(Grid);
