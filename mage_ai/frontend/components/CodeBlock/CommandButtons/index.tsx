import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { ContainerStyle } from './index.style';
import {
  PlayButtonFilled,
  Trash,
} from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '../index.style';

export type CommandButtonsSharedProps = {
  deleteBlock: (block: BlockType) => void;
}

type CommandButtonsProps = {
  block: BlockType;
} & CommandButtonsSharedProps;

function CommandButtons({
  block,
  deleteBlock,
}) {
  const themeContext = useContext(ThemeContext);

  return (
    <ContainerStyle>
      <FlexContainer
        alignItems="center"
        flexDirection="column"
      >
        <Button
          noBackground
          noBorder
          noPadding
        >
          <Circle
            color={getColorsForBlockType(block.type, { theme: themeContext }).accent}
            size={UNIT * 2.5}
          >
            <PlayButtonFilled
              black
              size={UNIT * 1.3}
            />
          </Circle>
        </Button>

        <Spacing mt={PADDING_UNITS}>
          <Button
            noBackground
            noBorder
            noPadding
            onClick={() => deleteBlock(block)}
          >
            <Trash size={UNIT * 2} />
          </Button>
        </Spacing>
      </FlexContainer>
    </ContainerStyle>
  );
}

export default CommandButtons;
