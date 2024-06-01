import React from 'react';
import styled from 'styled-components';
import { baseSm } from '../../styles/typography';

const TagStyled = styled.div`
  ${baseSm}

  background-color: ${({ theme }) => theme.colors.whiteHi};
  border-radius: ${({ theme }) => theme.borders.radius.round}px;
  padding: 4px 6px;
`;

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <TagStyled>
      {children}
    </TagStyled>
  );
}

export default Tag;
