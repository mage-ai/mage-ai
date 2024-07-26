import { css } from 'styled-components';

const base = css<{ small?: boolean }>`
  padding: ${({ small, theme }) => theme.padding[small ? 'sm' : 'base']}px;
`;

export default base;
