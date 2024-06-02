import React from 'react';
import styled from 'styled-components';
import { UNIT } from '../../themes/spaces';

type DividerProps = {
  short?: boolean;
};

export const DividerStyled = styled.div<DividerProps>`
  background-color: ${({ theme }) => theme.borders.color};
  height: 1px;
  margin-bottom: ${({ theme }) => theme.margin.base}px;
  margin-top: ${({ theme }) => theme.margin.base}px;

  ${({ short }) =>
    short &&
    `
    width: ${UNIT * 20}px;
  `}

  ${({ short }) =>
    !short &&
    `
    width: 100%;
  `}
`;

function Divider({ short }: DividerProps) {
  return <DividerStyled short={short} />;
}

export default Divider;
