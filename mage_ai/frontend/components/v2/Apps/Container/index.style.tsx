import styled from 'styled-components';

const LEFT_PEEK = 4;

export const Header = styled.header<{
  overlay?: boolean;
}>`
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: 1fr;
  justify-content: space-between;

  ${({ theme }) => `
    grid-column-gap: ${theme.padding.base}px;
  `}

  ${({ overlay, theme }) =>
    overlay &&
    `
    backdrop-filter: saturate(100%) blur(3px);
    background-color: ${theme.colors.backgrounds.blur};
    border-top-left-radius: ${theme.borders.radius.base};
    border-top-right-radius: ${theme.borders.radius.base};
    grid-auto-flow: column;
    padding-bottom: ${theme.padding.base}px;
    padding-left: ${theme.padding.base}px;
    padding-right: ${theme.padding.base - LEFT_PEEK}px;
    padding-top: ${theme.padding.base}px;
    position: absolute;
    width: calc(100% - ${theme.padding.base - LEFT_PEEK}px);
    z-index: 1;
  `}

  ${({ overlay, theme }) =>
    !overlay &&
    `
    padding: ${theme.padding.base}px;
  `}
`;
