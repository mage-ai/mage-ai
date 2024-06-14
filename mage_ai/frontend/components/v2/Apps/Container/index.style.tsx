import styled from 'styled-components';

const LEFT_PEEK = 4;

export const Header = styled.header<{
  overlay?: boolean;
  styles?: React.CSSProperties;
}>`
  display: grid;
  grid-template-rows: 1fr;
  justify-content: space-between;

  ${({ theme }) => `
    grid-column-gap: ${theme.padding.base}px;
    padding-left: ${theme.padding.sm}px;
    padding-right: ${theme.padding.sm}px;
  `}

  ${({ overlay, theme }) =>
    overlay &&
    `
    backdrop-filter: saturate(100%) blur(3px);
    background-color: ${theme.colors.backgrounds.blur};
    border-top-left-radius: ${theme.borders.radius.base};
    border-top-right-radius: ${theme.borders.radius.base};
    grid-auto-flow: column;
    position: absolute;
    width: calc(100% - ${theme.padding.base - LEFT_PEEK}px);
    z-index: 1;
  `}
`;
