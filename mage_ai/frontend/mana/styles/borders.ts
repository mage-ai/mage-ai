import { css } from 'styled-components';

const base = css`
  border-color: ${({ theme }) => theme.borders.color};
  border-radius: ${({ theme }) => theme.borders.radius.base}px;
  border-style: ${({ theme }) => theme.borders.style};
  border-width: ${({ theme }) => theme.borders.width}px;
`;

export default base;
