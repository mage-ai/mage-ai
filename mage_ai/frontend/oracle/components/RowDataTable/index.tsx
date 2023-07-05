import React from 'react';

import {
  FooterStyle,
  HeaderStyle,
  RowContainerStyle,
  TableStyle,
} from './index.style';

export type RowDataTableProps = {
  alternating?: boolean;
  children: any;
  footer?: JSX.Element;
  header: JSX.Element;
  minHeight?: number;
  scrollable?: boolean;
  width?: number;
};

function RowDataTable({
  alternating,
  children,
  footer,
  header,
  minHeight,
  scrollable,
  width,
}: RowDataTableProps) {
  return (
    <TableStyle width={width}>
      <HeaderStyle>
        {header}
      </HeaderStyle>

      <RowContainerStyle
        minHeight={minHeight}
        scrollable={scrollable}
      >
        {React.Children.map(children, (row, idx) => row && React.cloneElement(
          row,
          {
            footer: !!footer,
            last: idx === children.length - 1,
            secondary: alternating && idx % 2 === 1,
          },
        ))}
      </RowContainerStyle>

      <FooterStyle>
        {footer}
      </FooterStyle>
    </TableStyle>
  );
}

export default RowDataTable;
