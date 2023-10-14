import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';

import { 
  DropdownCellStyle, 
  DropdownContainerStyle, 
  DropdownHeaderStyle, 
  TimeColumnStyle,
  TimeListContainerStyle, 
} from './index.style';
import { PURPLE2 } from '@oracle/styles/colors/main';
import { abbreviatedTimezone, currentTimes, TimeZoneEnum, TIME_ZONE_NAMES } from '@utils/date';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

const DISPLAYED_TIME_ZONES = [TimeZoneEnum.UTC, TimeZoneEnum.LOCAL];

function ServerTimeDropdown() {
  const buttonRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [times, setTimes] = useState<Map<TimeZoneEnum, string>>(
    currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES }),
  );
  const [top, setTop] = useState<number>(0);

  const defaultTimeZone = shouldDisplayLocalTimezone 
    ? TimeZoneEnum.LOCAL 
    : TimeZoneEnum.UTC;

  useEffect(() => {
    // Make sure the dropdown shows below the button
    if (buttonRef?.current) {
      setTop(buttonRef.current.offsetHeight);
    }

    // Dynamically update the time every second
    const interval = setInterval(() => {
      const updatedTimes = currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES });
      setTimes(updatedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
          </DropdownContainerStyle>
        )}
      </div>
    </ClickOutside>
  );
}

export default ServerTimeDropdown;
