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
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import {
  KEY_CODE_NUMBERS_TO_NUMBER,
  KEY_CODE_NUMBER_0,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PipelineHeaderStyle } from './index.style';
import { dateFormatLongFromUnixTimestamp } from '@utils/string';

type KernelStatus = {
  isBusy: boolean;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: number;
  restartKernel: () => void;
};

function KernelStatus({
  isBusy,
  isPipelineUpdating,
  kernel,
  pipeline,
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
    <PipelineHeaderStyle
      onMouseEnter={() => setRestartKernelVisible(true)}
      onMouseLeave={() => setRestartKernelVisible(false)}
    >
      <FlexContainer
        alignItems="center"
        fullHeight
        justifyContent="space-between"
      >
        <Flex alignItems="center">
          <Text>
            Pipeline: {pipeline?.uuid}
          </Text>

          <Spacing mr={PADDING_UNITS} />

          <Text muted>
            {saveStatus}
          </Text>
        </Flex>

        <Flex alignItems="center">
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

          <Spacing mr={1} my={2} />

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
        </Flex>
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
