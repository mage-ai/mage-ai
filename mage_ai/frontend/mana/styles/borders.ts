import { css } from 'styled-components';

type BorderStyledProps = {
  muted?: boolean;
};

const shared = css`
  border-radius: ${({ theme }) => theme.borders.radius.base};
  border-style: ${({ theme }) => theme.borders.style};
  border-width: ${({ theme }) => theme.borders.width};
`;

const base = css<BorderStyledProps>`
  ${shared}
  border-color: ${({ muted, theme }) => theme.borders.color[muted ? 'muted' : 'base'].default};
`;

export const bordersTransparent = css`
  ${shared}
  border-color: transparent;
`;

export default base;
