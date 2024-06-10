import React, { forwardRef } from 'react';
import styled from 'styled-components';

type RowStyledProps = {
  row: number;
};
type RowProps = {
  children: React.ReactNode;
} & RowStyledProps;

const RowStyled = styled.div<RowStyledProps>`
  ${({ row }) => `
    grid-row: ${row};
  `}

  display: grid;
  width: inherit;
`;

function Row({ children, row = 0 }: RowProps, ref: React.Ref<HTMLDivElement>) {
  return <RowStyled ref={ref} row={row}>{children}</RowStyled>;
}

export default forwardRef(Row);
