import React from 'react';
import styled from 'styled-components';
import borders from '../../styles/borders';
import padding from '../../styles/padding';

type SectionProps = {
  children?: React.ReactNode;
  id?: string;
  muted?: boolean;
  stretch?: boolean;
};

const SectionStyled = styled.section<SectionProps>`
  ${borders}
  ${padding}

  height: ${({ stretch }) => (stretch ? '100%' : 'inherit')};
`;

function Section({ children, ...props }: SectionProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <SectionStyled {...props} ref={ref}>
      {children}
    </SectionStyled>
  );
}

export default React.forwardRef(Section);
