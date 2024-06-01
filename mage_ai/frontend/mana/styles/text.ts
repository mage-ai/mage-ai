import { css } from 'styled-components';

const base = css`
  color: ${({ theme }) => theme.fonts.color};
  font-family: ${({ theme }) => theme.fonts.family.base};
  font-size: ${({ theme }) => theme.fonts.size.base};
  font-style: ${({ theme }) => theme.fonts.style.base};
  font-weight: ${({ theme }) => theme.fonts.weight.regular};
  line-height: ${({ theme }) => theme.fonts.lineHeight.md};
`;

export default base;
