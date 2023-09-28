import React, { useContext } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ThemeContext } from 'styled-components';
import { getColorsForBlockType } from '../index.style';

type BlockExtraRowProps = {
  blocks: BlockType[];
  onClick: (block: BlockType) => void;
};

function BlockExtraRow({
  blocks,
  onClick,
}: BlockExtraRowProps) {
  const themeContext = useContext(ThemeContext);
  return (
    <FlexContainer alignItems="center">
      {blocks?.map(block => {
        const {
          color: colorInit,
          type,
          uuid,
        } = block;

        const color = getColorsForBlockType(
          type,
          {
            blockColor: colorInit,
            theme: themeContext,
          },
        ).accentLight;

        return (
          <Spacing key={uuid} ml={1} mt={1}>
            <Button
              backgroundColor={color}
              compact
              onClick={() => onClick(block)}
              small
            >
              <Text monospace small>
                {uuid}
              </Text>
            </Button>
          </Spacing>
        );
      })}
    </FlexContainer>
  );
}

export default BlockExtraRow;
