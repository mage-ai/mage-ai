import {
  useContext,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
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
import { dateFormatLongFromUnixTimestamp } from '@utils/string';

type KernelStatus = {
  isBusy: boolean;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: number;
  restartKernel: () => void;
};

function KernelStatus({
  isBusy,
  isPipelineUpdating,
  kernel,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
}) {
  const [restartKernelVisible, setRestartKernelVisible] = useState(false);
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
  } = kernel || {};
  let saveStatus;

  if (pipelineContentTouched) {
    saveStatus = 'Unsaved changes';
  } else if (isPipelineUpdating) {
    saveStatus = 'Saving changes...';
  } else if (pipelineLastSaved) {
    saveStatus = `Last saved ${dateFormatLongFromUnixTimestamp(Number(pipelineLastSaved) / 1000)}`;
  } else {
    saveStatus = 'All changes saved';
  }

  return (
    <FlexContainer
      alignItems="center"
      justifyContent="space-between"
      // @ts-ignore
      onMouseEnter={() => setRestartKernelVisible(true)}
      // @ts-ignore
      onMouseLeave={() => setRestartKernelVisible(false)}
    >
      <Flex alignItems="center">
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
              color={isBusy
                ? (themeContext || dark).borders.info
                : (alive
                  ? (themeContext || dark).borders.success
                  : (themeContext || dark).borders.danger
                )
              }
              size={UNIT}
            />

            <Spacing mr={1} />

            <Text>
              {alive ? `${name} kernel is ${isBusy ? 'busy' : 'alive'}` : 'Kernel is dead'}
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
      </Flex>

      <Text muted>
        {saveStatus}
      </Text>
    </FlexContainer>
  );
}

export default KernelStatus;
