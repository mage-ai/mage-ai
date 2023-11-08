import { useCallback, useEffect, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ServerTimeButton from './ServerTimeButton';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
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
import { abbreviatedTimezone, currentTimes, TimeZoneEnum, TIME_ZONE_NAMES } from '@utils/date';
import { 
  shouldDisplayLocalServerTime, 
  shouldIncludeServerTimeSeconds, 
  storeDisplayLocalServerTime, 
  storeIncludeServerTimeSeconds, 
} from '../../storage/serverTime';

const DISPLAYED_TIME_ZONES = [TimeZoneEnum.UTC, TimeZoneEnum.LOCAL];

function ServerTimeDropdown() {
  const [displayLocalServerTime, setDisplayLocalServerTime] = useState<boolean>(shouldDisplayLocalServerTime());
  const [includeServerTimeSeconds, setIncludeServerTimeSeconds] = useState<boolean>(shouldIncludeServerTimeSeconds());
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [times, setTimes] = useState<Map<TimeZoneEnum, string>>(
    currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES }),
  );
  const [top, setTop] = useState<number>(0);

  const defaultTimeZone = displayLocalServerTime
    ? TimeZoneEnum.LOCAL 
    : TimeZoneEnum.UTC;

  const isSmallBreakpoint = window.innerWidth < BREAKPOINT_MEDIUM;

  const handleButtonClick = useCallback(() => {
    setShowDropdown(prevState => !prevState);
  }, []);
  const setDropdownPosition = useCallback((top) => {
    setTop(top);
  }, []);
  const updateTimes = useCallback(() => {
    const updatedTimes = currentTimes({ 
      includeSeconds: includeServerTimeSeconds, 
      timeZones: DISPLAYED_TIME_ZONES, 
    });
    setTimes(prevState => {
      if (prevState.size === updatedTimes.size 
        && prevState.get(TimeZoneEnum.UTC) === updatedTimes.get(TimeZoneEnum.UTC)) {
        return prevState;
      }
      
      return updatedTimes;
    });
  }, [includeServerTimeSeconds]);

  const toggleDisplayLocalServerTime = () => {
    setDisplayLocalServerTime(storeDisplayLocalServerTime(!displayLocalServerTime));
  };
  const toggleIncludeServerTimeSeconds = () => {
    setIncludeServerTimeSeconds(storeIncludeServerTimeSeconds(!includeServerTimeSeconds));
  };

  const toggleOptions = [
    {
      checked: displayLocalServerTime,
      label: 'Show as local time',
      onCheck: toggleDisplayLocalServerTime,
    },
    {
      checked: includeServerTimeSeconds,
      label: 'Include seconds',
      onCheck: toggleIncludeServerTimeSeconds,
    },
  ];

  useEffect(() => {
    // Dynamically check the time every second and update the time display if necessary
    const interval = setInterval(() => {
      updateTimes();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateTimes]);

  useEffect(() => {
    // Immediately update the time display when "Include seconds" is toggled
    updateTimes();
  }, [includeServerTimeSeconds, updateTimes]);

  if (!times) return null;

  return (
    <ClickOutside onClickOutside={() => setShowDropdown(false)} open>
      <div style={{ position: 'relative' }}>
        <ServerTimeButton 
          active={showDropdown}
          disabled={isSmallBreakpoint}
          mountedCallback={setDropdownPosition}
          onClick={handleButtonClick}
          time={times.get(defaultTimeZone)}
          timeZone={abbreviatedTimezone(defaultTimeZone)}
        />

        {!isSmallBreakpoint && showDropdown && (
          <DropdownContainerStyle top={top}>
            <DropdownHeaderStyle>
              <Text bold muted uppercase>Current Time</Text>
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
