import React, { forwardRef } from 'react';
import styled from 'styled-components';

import { SharedStyledProps, shared } from '../index.style';

type RowStyledProps = SharedStyledProps;

type RowProps = {
  children: React.ReactNode;
} & RowStyledProps;

const RowStyled = styled.div<RowStyledProps>`
  ${shared}
`;

function Row({
  children,
  ...props
}: RowProps, ref: React.Ref<HTMLDivElement>) {
  return <RowStyled {...props} ref={ref} width="inherit">{children}</RowStyled>;
}

export default forwardRef(Row);
