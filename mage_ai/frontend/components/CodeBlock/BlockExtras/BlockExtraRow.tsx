import FlexContainer from '@oracle/components/FlexContainer';
import React, { useContext } from 'react';
import { getColorsForBlockType } from '../index.style';
import Spacing from '@oracle/elements/Spacing';
import Button from '@oracle/elements/Button';
import BlockType from '@interfaces/BlockType';
import { ThemeContext } from 'styled-components';
import Text from '@oracle/elements/Text';

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
