import React from 'react';

import Grid from '../../components/Grid';
import borders from '../../styles/borders';
import styled from 'styled-components';

type GroupStyleProps = {
  basic?: boolean;
  itemsContained?: boolean;
};

const GroupStyled = styled.div<GroupStyleProps>`
  ${({ itemsContained }) => (itemsContained ? borders : '')}
  ${({ itemsContained, theme }) =>
    itemsContained &&
    `
    padding: ${theme.buttons.padding.sm};
  `}

  ${({ basic, itemsContained, theme }) =>
    itemsContained &&
    !basic &&
    `
    padding-bottom: ${theme.buttons.padding.xxs};
    padding-top: ${theme.buttons.padding.xxs};
  `}
`;

function Group({
  basic,
  children,
  itemsContained,
}: { children: React.ReactNode } & GroupStyleProps) {
  return (
    <GroupStyled basic={basic} itemsContained={itemsContained}>
      <Grid
        alignItems='center'
        autoFlow='column'
        columnGap={itemsContained ? 12 : 8}
        height='100%'
        justifyContent='start'
        templateColumns='min-content'
        templateRows='1fr'
      >
        {React.Children.map(
          children,
          (child, index: number) =>
            child && (
              <div className='button-item' key={`button-item-${index}`} style={{ height: 'auto' }}>
                {child}
              </div>
            ),
        )}
      </Grid>
    </GroupStyled>
  );
}

export default Group;
