import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import dark from '@oracle/styles/themes/dark';

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
} from './utils';

const DISPLAYED_TIME_ZONES = [TimeZoneEnum.UTC, TimeZoneEnum.LOCAL];

function ServerTimeDropdown() {
  const buttonRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [times, setTimes] = useState<Map<TimeZoneEnum, string>>(
    currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES }),
  );
  const [top, setTop] = useState<number>(0);

  const displayLocalServerTime = shouldDisplayLocalServerTime();
  const includeServerTimeSeconds = shouldIncludeServerTimeSeconds();

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

  useEffect(() => {
    // Make sure the dropdown shows below the button
    if (buttonRef?.current) {
      setTop(buttonRef.current.offsetHeight);
    }

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
        <Button 
          backgroundColor={dark.background.dashboard}
          borderLess 
          compact 
          onClick={() => setShowDropdown(prevState => !prevState)}
          ref={buttonRef}
        >
          <Text inline monospace>
            {`${times.get(defaultTimeZone)} ${abbreviatedTimezone(defaultTimeZone)}`}
          </Text>
        </Button>

        {showDropdown && (
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
