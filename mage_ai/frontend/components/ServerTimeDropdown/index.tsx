import { useCallback, useEffect, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ServerTimeButton from './ServerTimeButton';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';

import { abbreviatedTimezone, currentTimes, TimeZoneEnum, TIME_ZONE_NAMES } from '@utils/date';
import { BREAKPOINT_MEDIUM } from '@styles/theme';
import { 
  DropdownCellStyle, 
  DropdownContainerStyle, 
  DropdownHeaderStyle, 
  TimeColumnStyle,
  TimeListContainerStyle,
  ToggleDropdownCellStyle,
  ToggleGroupStyle, 
} from './index.style';
import { PURPLE2 } from '@oracle/styles/colors/main';
import { 
  shouldDisplayLocalServerTime, 
  shouldIncludeServerTimeSeconds, 
  storeDisplayLocalServerTime, 
  storeIncludeServerTimeSeconds, 
} from './utils';

const DISPLAYED_TIME_ZONES = [TimeZoneEnum.UTC, TimeZoneEnum.LOCAL];

function ServerTimeDropdown() {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [times, setTimes] = useState<Map<TimeZoneEnum, string>>(
    currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES }),
  );
  const [top, setTop] = useState<number>(0);

  const displayLocalServerTime = shouldDisplayLocalServerTime();
  const includeServerTimeSeconds = shouldIncludeServerTimeSeconds();
  const isSmallBreakpoint = window.innerWidth < BREAKPOINT_MEDIUM;

  const defaultTimeZone = displayLocalServerTime
    ? TimeZoneEnum.LOCAL 
    : TimeZoneEnum.UTC;

  const toggleOptions = [
    {
      checked: displayLocalServerTime,
      label: 'Show as local time',
      onCheck: () => storeDisplayLocalServerTime(!displayLocalServerTime),
    },
    {
      checked: includeServerTimeSeconds,
      label: 'Include seconds',
      onCheck: () => storeIncludeServerTimeSeconds(!includeServerTimeSeconds),
    },
  ];

  const setDropdownPosition = useCallback((top) => {
    setTop(top);
  }, []);
  const handleButtonClick = useCallback(() => {
    setShowDropdown(prevState => !prevState);
  }, []);

  useEffect(() => {
    // Update the time immediately when "Include seconds" toggle switches
    const updatedTimes = currentTimes({ 
      includeSeconds: includeServerTimeSeconds, 
      timeZones: DISPLAYED_TIME_ZONES, 
    });
    setTimes(updatedTimes);

    // Dynamically update the time every second
    const interval = setInterval(() => {
      const updatedTimes = currentTimes({ 
        includeSeconds: includeServerTimeSeconds, 
        timeZones: DISPLAYED_TIME_ZONES, 
      });
      setTimes(updatedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [includeServerTimeSeconds]);

  if (!times) return null;

  return (
    <ClickOutside onClickOutside={() => setShowDropdown(false)} open>
      <div style={{ position: 'relative' }}>
        <ServerTimeButton 
          disabled={isSmallBreakpoint}
          mountedCallback={setDropdownPosition}
          onClick={handleButtonClick}
          time={times.get(defaultTimeZone)}
          timeZone={abbreviatedTimezone(defaultTimeZone)}
        />

        {!isSmallBreakpoint && showDropdown && (
          <DropdownContainerStyle top={top}>
            <DropdownHeaderStyle>
              <Text bold muted uppercase>Server Time</Text>
            </DropdownHeaderStyle>
            <TimeListContainerStyle>
              {DISPLAYED_TIME_ZONES.map((timeZone) => (
                <TimeColumnStyle key={timeZone}>
                  <DropdownCellStyle>
                    <Text bold center muted uppercase>
                      {`${timeZone}${timeZone === TimeZoneEnum.LOCAL ? ` - ${abbreviatedTimezone(timeZone)}` : ''}`}
                    </Text>
                  </DropdownCellStyle>
                  <DropdownCellStyle flexDirection="column" flexGrow={3}>
                    <Text bold center color={PURPLE2} largeLg>
                      {times.get(timeZone)}
                    </Text>
                    <Text center muted small>
                      {timeZone === TimeZoneEnum.UTC ? 'Universal Time' : TIME_ZONE_NAMES[timeZone]}
                    </Text>
                  </DropdownCellStyle>
                </TimeColumnStyle>
                ))
              }
            </TimeListContainerStyle>
            <ToggleGroupStyle>
              {toggleOptions.map((option) => (
                <ToggleDropdownCellStyle key={option.label}>
                  <ToggleSwitch 
                    checked={option.checked}
                    compact 
                    onCheck={option.onCheck} 
                    purpleBackground
                  />
                  <Text>{option.label}</Text>
                </ToggleDropdownCellStyle>
              ))}
            </ToggleGroupStyle>
          </DropdownContainerStyle>
        )}
      </div>
    </ClickOutside>
  );
}

export default ServerTimeDropdown;
