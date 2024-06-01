import { css } from 'styled-components';
import { outlineHover, transition } from './mixins';

const base = css`
  ${({ theme }) => outlineHover(theme.colors.backgrounds.button.base)}
  ${transition}
  background-color: ${({ theme }) => theme.colors.backgrounds.button.base};
  border: none;
  border-radius: ${({ theme }) => theme.borders.radius.base};
  color: ${({ theme }) => theme.fonts.color};
  font-family: ${({ theme }) => theme.fonts.family.base};
  font-size: ${({ theme }) => theme.fonts.size.base};
  font-style: ${({ theme }) => theme.fonts.style.base};
  font-weight: ${({ theme }) => theme.fonts.weight.semiBold};
  line-height: ${({ theme }) => theme.fonts.lineHeight.md};
  padding: ${({ theme }) => theme.buttons.padding};

  &:hover {
    background-color: ${({ theme }) => theme.colors.backgrounds.button.hover};
    cursor: pointer;
  }
`;

export default base;
