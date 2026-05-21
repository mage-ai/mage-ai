import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { PADDING, UNIT } from '@oracle/styles/units/spacing';

export const DateRangeContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  border-style: ${BORDER_STYLE};
  border-width: ${BORDER_WIDTH}px;
  display: flex;
  flex-direction: column;
  gap: ${UNIT * 1.5}px;
  margin-top: ${UNIT / 2}px;
  padding: ${PADDING}px;
  width: ${UNIT * 44}px;

  ${props => `
    background: ${(props.theme?.background || dark.background).popup};
    border-color: ${(props.theme?.interactive || dark.interactive).defaultBorder};
    box-shadow: ${(props.theme?.shadow || dark.shadow).popup};
  `}

  /* Uniform tile height so the Start/End labels don't push individual rows taller */
  .react-calendar__month-view__days__day {
    height: 52px;
    position: relative;
  }

  /* Date range highlighting */
  .react-calendar__tile.dr-between {
    background: rgba(72, 119, 255, 0.12);
    border-radius: 0;
  }

  .react-calendar__tile.dr-start:not(.dr-single)::before,
  .react-calendar__tile.dr-end:not(.dr-single)::before {
    bottom: 0;
    content: '';
    position: absolute;
    top: 0;
    background: rgba(72, 119, 255, 0.12);
  }

  .react-calendar__tile.dr-start:not(.dr-single)::before {
    left: 50%;
    right: 0;
  }

  .react-calendar__tile.dr-end:not(.dr-single)::before {
    left: 0;
    right: 50%;
  }

  .react-calendar__tile.dr-start abbr,
  .react-calendar__tile.dr-end abbr {
    align-items: center;
    background: #4877FF;
    border-radius: 50%;
    color: #fff !important;
    display: flex;
    height: 32px;
    justify-content: center;
    margin: 0 auto;
    position: relative;
    width: 32px;
    z-index: 1;
  }

  /* Override react-calendar default active/hover on range tiles */
  .react-calendar__tile.dr-start:enabled:hover,
  .react-calendar__tile.dr-start:enabled:focus,
  .react-calendar__tile.dr-end:enabled:hover,
  .react-calendar__tile.dr-end:enabled:focus,
  .react-calendar__tile.dr-between:enabled:hover,
  .react-calendar__tile.dr-between:enabled:focus {
    background: rgba(72, 119, 255, 0.12);
  }

  .react-calendar__tile.dr-start:enabled:hover abbr,
  .react-calendar__tile.dr-start:enabled:focus abbr,
  .react-calendar__tile.dr-end:enabled:hover abbr,
  .react-calendar__tile.dr-end:enabled:focus abbr {
    background: #5982ff;
  }

  /* Date range labels — absolutely positioned so they never affect tile height */
  .dr-label {
    bottom: 1px;
    color: #86E2FF;
    font-size: 8px;
    font-weight: 700;
    left: 0;
    letter-spacing: 0.02em;
    line-height: 1;
    position: absolute;
    right: 0;
    text-align: center;
    text-transform: uppercase;
    z-index: 1;
  }
`;

export const DateRangeFieldsStyle = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${UNIT / 2}px;
`;

export const DateRangeFieldRowStyle = styled.div<{ active?: boolean }>`
  align-items: center;
  border-radius: ${BORDER_RADIUS}px;
  border-style: ${BORDER_STYLE};
  border-width: ${BORDER_WIDTH}px;
  cursor: pointer;
  display: flex;
  gap: ${UNIT}px;
  padding: ${UNIT * 0.75}px ${UNIT * 1.5}px;

  ${props => `
    background: ${props.active
      ? (props.theme?.interactive || dark.interactive).defaultBackground
      : 'transparent'};
    border-color: ${props.active
      ? (props.theme?.interactive || dark.interactive).focusBorder
      : (props.theme?.interactive || dark.interactive).defaultBorder};
  `}

  &:hover {
    ${props => !props.active && `
      border-color: ${(props.theme?.interactive || dark.interactive).hoverBorder};
    `}
  }
`;
