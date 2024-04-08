import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import ClickOutside from '@oracle/components/ClickOutside';
import ServerTimeButton from './ServerTimeButton';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
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
import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import {
  LOCAL_TIMEZONE_TOOLTIP_PROPS,
  shouldDisplayLocalTimezone,
  storeLocalTimezoneSetting,
} from '@components/settings/workspace/utils';
import { PURPLE2 } from '@oracle/styles/colors/main';
import { abbreviatedTimezone, currentTimes, TimeZoneEnum, TIME_ZONE_NAMES } from '@utils/date';
import { onSuccess } from '@api/utils/response';
import {
  shouldIncludeServerTimeSeconds,
  storeIncludeServerTimeSeconds,
} from '../../storage/serverTime';
import { useError } from '@context/Error';

const DISPLAYED_TIME_ZONES = [TimeZoneEnum.UTC, TimeZoneEnum.LOCAL];

type ServerTimeDropdownProps = {
  disabled?: boolean;
  disableTimezoneToggle?: boolean;
  projectName: string;
};

function ServerTimeDropdown({
  disabled,
  disableTimezoneToggle,
  projectName,
}: ServerTimeDropdownProps) {
  const [displayLocalTimezone, setDisplayLocalTimezone] = useState<boolean>(shouldDisplayLocalTimezone());
  const [includeServerTimeSeconds, setIncludeServerTimeSeconds] = useState<boolean>(shouldIncludeServerTimeSeconds());
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [times, setTimes] = useState<Map<TimeZoneEnum, string>>(
    currentTimes({ includeSeconds: true, timeZones: DISPLAYED_TIME_ZONES }),
  );
  const [top, setTop] = useState<number>(0);

  const defaultTimeZone = displayLocalTimezone
    ? TimeZoneEnum.LOCAL
    : TimeZoneEnum.UTC;

  const isSmallBreakpoint = window.innerWidth < BREAKPOINT_MEDIUM;

  const [showError] = useError(null, {}, [], {
    uuid: 'components/ServerTimeDropdown',
  });
  const [updateProject]: any = useMutation(
    api.projects.useUpdate(projectName),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

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
    const displayLocalTimeUpdated = !displayLocalTimezone;
    setDisplayLocalTimezone(storeLocalTimezoneSetting(displayLocalTimeUpdated));
    updateProject({
      project: {
        features: {
          [FeatureUUIDEnum.LOCAL_TIMEZONE]: displayLocalTimeUpdated,
        },
      },
    });
  };
  const toggleIncludeServerTimeSeconds = () => {
    setIncludeServerTimeSeconds(storeIncludeServerTimeSeconds(!includeServerTimeSeconds));
  };

  const toggleOptions = [
    {
      checked: displayLocalTimezone,
      disabled: disableTimezoneToggle,
      label: disableTimezoneToggle
        ? 'Display local timezone (must be changed in platform preferences)'
        : 'Display local timezone (requires refresh)',
      onCheck: toggleDisplayLocalServerTime,
      uuid: FeatureUUIDEnum.LOCAL_TIMEZONE,
    },
    {
      checked: includeServerTimeSeconds,
      label: 'Include seconds in current time',
      onCheck: toggleIncludeServerTimeSeconds,
      uuid: 'current_time_seconds',
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
          disabled={isSmallBreakpoint || disabled}
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
                    disabled={option.disabled}
                    onCheck={option.onCheck}
                    purpleBackground={!option.disabled}
                  />

                  <Text>{option.label}</Text>

                  {option.uuid === FeatureUUIDEnum.LOCAL_TIMEZONE &&
                    <Tooltip
                      {...LOCAL_TIMEZONE_TOOLTIP_PROPS}
                      appearAbove
                      appearBefore
                      size={ICON_SIZE_SMALL}
                    />
                  }
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
