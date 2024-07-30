import styled from 'styled-components';

export type StyledProps = {
  height?: number;
  left?: number;
  margin?: number;
  top?: number;
  zIndex?: number;
  width?: number;
};

export const Styled = styled.div<StyledProps>`
  ${({ margin, height, left, top, zIndex, width }) => `
    height: ${height ?? 0}px;
    margin: ${margin ?? 0}px;
    left: ${left ?? 0}px;
    top: ${top ?? 0}px;
    width: ${width ?? 0}px;
    z-index: ${zIndex ?? 0};
  `}

  align-items: center;
  display: flex;
  justify-content: center;
  position: absolute;

  .svg-border {
    left: 0;
    position: absolute;
    top: 0;
  }

  .neon {
    filter: url(#neon);
  }
`;
