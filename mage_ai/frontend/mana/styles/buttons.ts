import { css } from 'styled-components';

const base = css`
  background: ${({ theme }) => theme.backgrounds.button};
  border: none;
  border-radius: ${({ theme }) => theme.borders.radius.base}px;
  color: ${({ theme }) => theme.fonts.color};
  font-family: ${({ theme }) => theme.fonts.family.base};
  font-size: ${({ theme }) => theme.fonts.size.base};
  font-style: ${({ theme }) => theme.fonts.style.base};
  font-weight: ${({ theme }) => theme.fonts.weight.semiBold};
  line-height: ${({ theme }) => theme.fonts.lineHeight.md};
  padding: ${({ theme }) => theme.buttons.padding};
`;

export default base;
