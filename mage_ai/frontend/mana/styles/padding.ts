import { css } from 'styled-components';

const base = css`
  padding: ${({ small, theme }) => theme.padding[small ? 'sm' : 'base']}px;
`;

export default base;
