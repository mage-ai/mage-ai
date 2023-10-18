import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

const BAR_HEIGHT = 3 * UNIT;

export const BarsContainerStyle = styled.div`
  width: 100%;
`;

export const BarContainerStyle = styled.div`
  align-items: center;
  display: flex;
  height: ${BAR_HEIGHT}px;
  width: 100%;
`;

export const BarStyle = styled.div<{
  blue?: boolean;
  empty?: boolean;
  green?: boolean;
  orange?: boolean;
  purple?: boolean;
  red?: boolean;
  teal?: boolean;
  yellow?: boolean;
  widthPercentage: number;
}>`
  height: 100%;

  ${props => props.widthPercentage && `
    width: ${props.widthPercentage * 100}%;
  `}

  ${props => props.blue && `
    background-color: ${(props.theme || dark).accent.blue};
  `}

  ${props => props.green && `
    background-color: ${(props.theme || dark).accent.positive};
  `}

  ${props => props.orange && `
    background-color: ${(props.theme || dark).accent.dbt};
  `}

  ${props => props.purple && `
    background-color: ${(props.theme || dark).accent.purple};
  `}

  ${props => props.red && `
    background-color: ${(props.theme || dark).accent.negative};
  `}

  ${props => props.teal && `
    background-color: ${(props.theme || dark).accent.teal};
  `}

  ${props => props.yellow && `
    background-color: ${(props.theme || dark).accent.yellow};
  `}

  ${props => props.empty && `
    background-color: ${(props.theme || dark).background.chartBlock};
  `}
`;

export const FillerStyle = styled.div`
  height: ${BAR_HEIGHT}px;
  width: 100%;
`;

export const TextStyle = styled.div`
  align-items: center;
  display: flex;
  height: ${BAR_HEIGHT}px;
  justify-content: flex-end;
`;
