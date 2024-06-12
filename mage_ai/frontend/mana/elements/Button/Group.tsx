import React from 'react';

import Grid from '../../components/Grid';
import borders from '../../styles/borders';
import styled from 'styled-components';

type GroupStyleProps = {
  itemsContained?: boolean;
};

const GroupStyled = styled.div<GroupStyleProps>`
  ${({ itemsContained }) => (itemsContained ? borders : '')}
  ${({ itemsContained, theme }) =>
    itemsContained &&
    `
      padding: ${theme.buttons.padding.sm};
    `}
`;

function Group({ children, itemsContained }: { children: React.ReactNode } & GroupStyleProps) {
  return (
    <GroupStyled itemsContained={itemsContained}>
      <Grid
        alignItems="center"
        autoFlow="column"
        columnGap={12}
        height="100%"
        justifyContent="start"
        templateColumns="min-content"
        templateRows="1fr"
      >
        {React.Children.map(children, (child, index: number) => (
          <div className="button-item" key={`button-item-${index}`} style={{ height: 'inherit' }}>
            {child}
          </div>
        ))}
      </Grid>
    </GroupStyled>
  );
}

export default Group;
