import { useState } from 'react';
import Router, { useRouter } from 'next/router';

import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import { LogRangeEnum } from '@interfaces/LogType';
import { LOG_RANGE_SEC_INTERVAL_MAPPING, SPECIFIC_LOG_RANGES } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';


enum RangeQueryEnum {
  START = 'start_timestamp',
  END = 'end_timestamp',
}

type LogToolbarProps = {
  fetchLogs: () => void;
  setLogCount: (offset: number) => void;
};

function LogToolbar({
  fetchLogs,
  setLogCount,
}: LogToolbarProps) {
  const [selectedRange, setSelectedRange] = useState<LogRangeEnum>(null);
  const router = useRouter();
  const { pipeline: pipelineUUID } = router.query;

  return (
    <Spacing py={1}>
      <FlexContainer alignItems="center">
        <KeyboardShortcutButton
          blackBorder
          inline
          onClick={fetchLogs}
          sameColorAsText
          uuid="logs/load_newest"
        >
          Load latest logs
        </KeyboardShortcutButton>

        <Spacing mr={2} />

        <Select
          compact
          defaultColor
          onChange={e => {
            // e.preventDefault();
            const range = e.target.value;
            setSelectedRange(range);
            if (SPECIFIC_LOG_RANGES.includes(range)) {
              const startTimestamp = calculateStartTimestamp(LOG_RANGE_SEC_INTERVAL_MAPPING[range]);
              goToWithQuery({ [RangeQueryEnum.START]: startTimestamp });
            } else if (range === LogRangeEnum.LAST_40_RUNS) {
              Router.push(`/pipelines/${pipelineUUID}/logs`);
            } else if (range === LogRangeEnum.CUSTOM_RANGE) {
              // show time range dropdowns
            }
          }}
          paddingRight={UNIT * 5}
          placeholder="Select time range"
          value={selectedRange}
        >
          {Object.values(LogRangeEnum).map(range => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </Select>
      </FlexContainer>
    </Spacing>
  );
}

export default LogToolbar;
