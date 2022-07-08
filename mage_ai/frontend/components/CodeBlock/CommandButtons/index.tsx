import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { ContainerStyle } from './index.style';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  Close,
  PlayButtonFilled,
  Trash,
} from '@oracle/icons';
import {
  KEY_SYMBOL_D,
  KEY_SYMBOL_ENTER,
  KEY_SYMBOL_I,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '../index.style';

export type CommandButtonsSharedProps = {
  deleteBlock: (block: BlockType) => void;
  executionState: ExecutionStateEnum;
  interruptKernel: () => void;
};

type CommandButtonsProps = {
  block: BlockType;
  runBlock: () => void;
} & CommandButtonsSharedProps;

function CommandButtons({
  block,
  deleteBlock,
  executionState,
  interruptKernel,
  runBlock,
}: CommandButtonsProps) {
  const { uuid } = block;
  const themeContext = useContext(ThemeContext);
  const isInProgress = ExecutionStateEnum.IDLE !== executionState;
  const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;

  return (
    <ContainerStyle>
      <FlexContainer
        alignItems="center"
        flexDirection="column"
      >
        {ExecutionStateEnum.QUEUED === executionState && (
          <Spinner
            color={(themeContext || dark).content.active}
            type="cylon"
          />
        )}
        {ExecutionStateEnum.BUSY === executionState && (
          <Spinner
            color={(themeContext || dark).content.active}
          />
        )}

        {!isInProgress && (
          <Tooltip
            appearAbove
            appearBefore
            default
            label={(
              <Text>
                Run block
                &nbsp;
                &nbsp;
                <KeyboardTextGroup
                  inline
                  keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
                  monospace
                  uuidForKey={uuid}
                />
              </Text>
            )}
            size={UNIT * 3}
            widthFitContent
          >
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
          </Tooltip>
        )}

        <Spacing mt={PADDING_UNITS}>
          <Tooltip
            appearBefore
            default
            label={(
              <Text>
                Delete block and file
                &nbsp;
                &nbsp;
                <KeyboardTextGroup
                  inline
                  monospace
                  keyTextGroups={[[KEY_SYMBOL_D], [KEY_SYMBOL_D]]}
                  uuidForKey={uuid}
                />
              </Text>
            )}
            size={UNIT * 2.5}
            widthFitContent
          >
            <Button
              noBackground
              noBorder
              noPadding
              onClick={() => deleteBlock(block)}
            >
              <Trash size={UNIT * 2.5} />
            </Button>
          </Tooltip>
        </Spacing>

        {isInProgress && (
          <Spacing mt={PADDING_UNITS}>
            <Tooltip
              appearAbove
              appearBefore
              default
              label={(
                <Text>
                  Interrupt kernel
                  &nbsp;
                  &nbsp;
                  <KeyboardTextGroup
                    inline
                    monospace
                    keyTextGroups={[[KEY_SYMBOL_I], [KEY_SYMBOL_I]]}
                    uuidForKey={uuid}
                  />
                </Text>
              )}
              size={UNIT * 2.5}
              widthFitContent
            >
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
            </Tooltip>
          </Spacing>
        )}
      </FlexContainer>
    </ContainerStyle>
  );
}

export default CommandButtons;
