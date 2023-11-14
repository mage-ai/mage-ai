import React from 'react';
import { Col as ColStyled } from 'styled-bootstrap-grid';

type ColProps = {
  children?: any;
  fullHeight?: boolean;
  gutter?: number;
  hiddenLgDown?: boolean;
  hiddenLgUp?: boolean;
  hiddenMdDown?: boolean;
  hiddenMdUp?: boolean;
  hiddenSmDown?: boolean;
  hiddenSmUp?: boolean;
  hiddenXlDown?: boolean;
  hiddenXlUp?: boolean;
  hiddenXsDown?: boolean;
  hiddenXsUp?: boolean;
  lg?: number;
  md?: number;
  sm?: number;
  style?: {
    [key: string]: number | string;
  };
  xl?: number;
  xs?: number;
  xxl?: number;
};

function Col({
  children,
  fullHeight,
  gutter,
  style: styleProp = {},
  ...props
}: ColProps) {
  const style: {
    height?: string | number;
    paddingLeft?: number;
    paddingRight?: number;
  } = { ...styleProp };

  if (gutter) {
    style.paddingLeft = gutter;
    style.paddingRight = style.paddingLeft;
  }

  if (fullHeight) {
    style.height = '100%';
  }

  return (
    <ColStyled
      {...props}
      style={style}
    >
      {children}
    </ColStyled>
  );
}

export default Col;
