import tzMoment from 'moment-timezone';
import { createRef, useEffect, useMemo, useRef, useState } from 'react';

import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, TIME_FORMAT, momentInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import KernelOutputType from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import useKernel, { UseKernelType } from '@utils/models/kernel/useKernel';
import { SHARED_FILE_HEADER_BUTTON_PROPS } from '@components/PipelineDetail/FileHeaderMenu/constants';
import { UNIT } from '@oracle/styles/units/spacing';

function KernelHeader({
  compact,
  fixed,
  outputs,
  refreshInterval = 12000,
  revalidateOnFocus = true,
  showError,
}: {
  compact?: boolean;
  fixed?: boolean;
  outputs?: KernelOutputType[];
} & UseKernelType) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const buttonRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  const {
    fetch,
    health,
    interrupt,
    kernel,
    restart,
  } = useKernel({
    checkExecutionState: false,
    refreshInterval,
    revalidateOnFocus,
    showError,
  });

  const items = useMemo(() => {
    const arr = [
      {
        onClick: () => restart(),
        uuid: 'Restart kernel',
      },
      {
        onClick: () => interrupt(),
        uuid: 'Interrupt kernel',
      },
      {
        onClick: () => fetch(),
        uuid: 'Get latest status',
      },
    ];

    if (outputs?.length >= 1) {
      const output = outputs?.[outputs?.length - 1];
      const datetime = momentInLocalTimezone(
        tzMoment(output?.[0]?.execution_metadata?.date),
        displayLocalTimezone,
      ).format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);

      arr.push({
        isGroupingTitle: true,
        label: () => (
          <FlexContainer flexDirection="column">
            <Text default monospace small>
              Kernel alive
            </Text>
            <Text default monospace small>
              Last checked:
            </Text>
            <Text default monospace small>
              {utcStringToElapsedTime(datetime, true)}
            </Text>
            <Spacing mb={1} />
          </FlexContainer>
        ),
        onClick: () => false,
        uuid: 'Health',
      });
    }

    return arr;
  }, [
    fetch,
    health,
    outputs,
    restart,
    interrupt,
  ]);

  const limbo = useMemo(() => typeof outputs !== 'undefined' && !outputs?.length, [outputs]);

  return (
    <ClickOutside
      onClickOutside={() => setHighlightedIndex(null)}
      open
      style={{
        height: '100%',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ position: 'relative' }}>
        <Button
          beforeIcon={
            <Circle
              danger={!limbo && !kernel?.alive}
              size={1 * UNIT}
              warning={limbo}
              success={!limbo && kernel?.alive}
            />
          }
          compact
          onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
          onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
          ref={buttonRef}
          secondary
          small
        >
          <Text monospace noWrapping small>
            {kernel?.name || 'Kernel'} {compact ? '' : limbo
              ? 'status unknown 🤷'
              : kernel?.alive
                ? 'alive'
                : 'dead'}
          </Text>
          <FlyoutMenu
            fixed={fixed}
            items={items}
            left='default'
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 0}
            parentRef={buttonRef}
            uuid="KernelHeader"
            width={180}
          />
        </Button>

      </div>
    </ClickOutside>
  );
}

export default KernelHeader;
