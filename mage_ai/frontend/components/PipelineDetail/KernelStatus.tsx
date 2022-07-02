import {
  useContext,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import {
  KEY_CODE_NUMBERS_TO_NUMBER,
  KEY_CODE_NUMBER_0,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';

type KernelStatus = {
  kernel: KernelType;
  restartKernel: () => void;
};

function KernelStatus({
  kernel,
  restartKernel,
}) {
  const [restartKernelVisible, setRestartKernelVisible] = useState(false);
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
  } = kernel || {};

  return (
    <FlexContainer
      alignItems="center"
      // @ts-ignore
      onMouseEnter={() => setRestartKernelVisible(true)}
      // @ts-ignore
      onMouseLeave={() => setRestartKernelVisible(false)}
    >
      <Tooltip
        block
        label={alive
          ? 'Kernel is alive and well.'
          : 'Kernel has not started or died, please restart.'
        }
        size={null}
        widthFitContent
      >
        <FlexContainer alignItems="center">
          <Circle
            color={alive
              ? (themeContext || dark).borders.success
              : (themeContext || dark).borders.danger
            }
            size={UNIT}
          />

          <Spacing mr={1} />

          <Text>
            {alive ? `${name} is alive` : 'Kernel is dead'}
          </Text>
        </FlexContainer>
      </Tooltip>

      <Spacing mr={1} my={2} />

      {(!alive || restartKernelVisible) && (
        <KeyboardShortcutButton
          compact
          inline
          keyTextGroups={[
            [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
            [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
          ]}
          onClick={() => restartKernel()}
          uuid="KernelStatus/restartKernel"
        >
          {alive ? 'Restart' : 'Start'} kernel
        </KeyboardShortcutButton>
      )}
    </FlexContainer>
  );
}

export default KernelStatus;
