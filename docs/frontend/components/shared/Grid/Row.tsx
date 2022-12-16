import React from 'react';
import { Row as RowStyled } from 'styled-bootstrap-grid';

type RowProps = {
  children: any;
  fullHeight?: boolean;
  gutter?: number;
  style?: {
    [key: string]: number | string;
  };
};

function Row({
  children,
  fullHeight,
  gutter,
  style: styleProp = {},
  ...props
}: RowProps) {
  const style: {
    height?: string | number;
    marginLeft?: number;
    marginRight?: number;
  } = { ...styleProp };

  if (gutter) {
    style.marginLeft = -1 * gutter;
    style.marginRight = style.marginLeft;
  }

  if (fullHeight) {
    style.height = '100%';
  }

  return (
    <RowStyled
      {...props}
      style={style}
    >
      {React.Children.map(children, (col, idx) => col && React.cloneElement(col, {
        gutter,
        key: idx,
      }))}
    </RowStyled>
  );
}

export default Row;
