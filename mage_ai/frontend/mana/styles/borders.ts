import { css } from 'styled-components';

const shared = css`
  border-radius: ${({ theme }) => theme.borders.radius.base};
  border-style: ${({ theme }) => theme.borders.style};
  border-width: ${({ theme }) => theme.borders.width};
`;

const base = css`
  ${shared}
  border-color: ${({ theme }) => theme.borders.color.base.default};
`;

export const bordersTransparent = css`
  ${shared}
  border-color: transparent;
`;

export default base;
