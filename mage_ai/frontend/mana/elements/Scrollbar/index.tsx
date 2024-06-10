import { forwardRef } from 'react';
import styled from 'styled-components';

import scrollbars, { ScrollbarsStyledProps } from '../../styles/scrollbars';

type ScrollbarProps = { children: React.ReactNode } & ScrollbarsStyledProps;

const ScrollbarStyled = styled.div`
  ${scrollbars}
`;

function Scrollbar({ children, hidden, ...props }: ScrollbarProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <ScrollbarStyled {...props} hidden={hidden} ref={ref}>
      {children}
    </ScrollbarStyled>
  );
}

export default forwardRef(Scrollbar);
