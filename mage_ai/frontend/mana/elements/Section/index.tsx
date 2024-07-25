import React from 'react';
import styled from 'styled-components';
import borders from '../../styles/borders';
import padding from '../../styles/padding';

type SectionProps = {
  children?: React.ReactNode;
  id?: string;
  muted?: boolean;
  stretch?: boolean;
  small?: boolean;
  style?: React.CSSProperties;
  withBackground?: boolean;
};

const SectionStyled = styled.section<SectionProps>`
  ${borders}
  ${padding}

  height: ${({ stretch }) => (stretch ? '100%' : 'inherit')};

  ${({ withBackground }) => withBackground && `
    background-color: var(--menus-background-base-default);
    border-color: var(--borders-color-button-base-default);
  `}
`;

function Section({ children, ...props }: SectionProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <SectionStyled {...props} ref={ref}>
      {children}
    </SectionStyled>
  );
}

export default React.forwardRef(Section);
