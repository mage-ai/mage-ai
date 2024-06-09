import React from 'react';
import styled from 'styled-components';
import { UNIT } from '../../themes/spaces';

type DividerProps = {
  short?: boolean;
  vertical?: boolean;
};

export const DividerStyled = styled.div<DividerProps>`
  background-color: ${({ theme }) => theme.borders.color};

  ${({ short, vertical }) => short && !vertical && `
    width: ${UNIT * 20}px;
  `}

  ${({ short, vertical }) => !short && !vertical && `
    width: 100%;
  `}

  ${({ vertical }) => !vertical && `
    height: 1px;
    margin-bottom: ${({ theme }) => theme.margin.base}px;
    margin-top: ${({ theme }) => theme.margin.base}px;
  `}

  ${({ vertical }) => vertical && `
    height: 100%;
    width: 1px;
  `}
`;

function Divider(props: DividerProps) {
  return <DividerStyled {...props} />;
}

export default Divider;
