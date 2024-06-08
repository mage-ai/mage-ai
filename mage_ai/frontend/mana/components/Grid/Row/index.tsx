import React from 'react';
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
`;

function Row({
  children,
  row = 0,
}: RowProps) {
  return <RowStyled row={row}>{children}</RowStyled>;
}

export default Row;
