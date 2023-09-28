import React from 'react';

import {
  FooterStyle,
  HeaderStyle,
  RowContainerStyle,
  RowStyle as RowStyle2,
  TableStyle,
} from './index.style';

export const RowStyle = RowStyle2;

export type RowDataTableProps = {
  alternating?: boolean;
  children: any;
  footer?: JSX.Element;
  header?: JSX.Element;
  maxHeight?: number;
  minHeight?: number;
  noBackground?: boolean;
  noBoxShadow?: boolean;
  sameColorBorders?: boolean;
  scrollable?: boolean;
  width?: number;
};

function RowDataTable({
  alternating,
  children,
  footer,
  header,
  maxHeight,
  minHeight,
  noBackground,
  noBoxShadow,
  sameColorBorders,
  scrollable,
  width,
}: RowDataTableProps) {
  // Line below added because the children prop does not return an array when
  // there is only 1 child, which affects styling when there is only 1 row/child.
  const childrenArr = ([]).concat(children).filter(child => child !== null);

  return (
    <TableStyle
      noBackground={noBackground}
      noBoxShadow={noBoxShadow}
      width={width}
    >
      {header &&
        <HeaderStyle>
          {header}
        </HeaderStyle>
      }

      <RowContainerStyle
        maxHeight={maxHeight}
        minHeight={minHeight}
        scrollable={scrollable}
      >
        {React.Children.map(childrenArr, (row, idx) => row && React.cloneElement(
          row,
          {
            last: idx === childrenArr.length - 1,
            sameColorBorders,
            secondary: alternating && idx % 2 === 1,
          },
        ))}
      </RowContainerStyle>

      {footer &&
        <FooterStyle>
          {footer}
        </FooterStyle>
      }
    </TableStyle>
  );
}

export default RowDataTable;
