import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import { ContainerStyle } from './index.style';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  Close,
  PlayButtonFilled,
  Trash,
} from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '../index.style';

export type CommandButtonsSharedProps = {
  deleteBlock: (block: BlockType) => void;
  interruptKernel: () => void;
}

type CommandButtonsProps = {
  block: BlockType;
  runBlock: () => void;
  status: ExecutionStateEnum;
} & CommandButtonsSharedProps;

function CommandButtons({
  block,
  deleteBlock,
  interruptKernel,
  runBlock,
  status
}) {
  const themeContext = useContext(ThemeContext);
  const isInProgress = ExecutionStateEnum.BUSY === status;
  const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;

  return (
    <ContainerStyle>
      <FlexContainer
        alignItems="center"
        flexDirection="column"
      >
        {isInProgress && (
          <Spinner
            color={(themeContext || dark).content.active}
          />
        )}
        {!isInProgress && (
          <Button
            noBackground
            noBorder
            noPadding
            onClick={() => runBlock()}
          >
            <Circle
              color={color}
              size={UNIT * 3}
            >
              <PlayButtonFilled
                black
                size={UNIT * 1.5}
              />
            </Circle>
          </Button>
        )}

        <Spacing mt={PADDING_UNITS}>
          <Button
            noBackground
            noBorder
            noPadding
            onClick={() => deleteBlock(block)}
          >
            <Trash size={UNIT * 2.5} />
          </Button>
        </Spacing>

        {isInProgress && (
          <Spacing mt={PADDING_UNITS}>
            <Button
              noBackground
              noBorder
              noPadding
              onClick={() => interruptKernel()}
            >
              <Circle
                borderSize={1.5}
                size={UNIT * 2.5}
              >
                <Close size={UNIT * 1} />
              </Circle>
            </Button>
          </Spacing>
        )}
      </FlexContainer>
    </ContainerStyle>
  );
}

export default CommandButtons;
