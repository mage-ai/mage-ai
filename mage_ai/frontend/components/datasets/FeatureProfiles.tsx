import React from 'react';
import styled from 'styled-components';

import FeatureType, { COLUMN_TYPE_DATETIME, COLUMN_TYPE_HUMAN_READABLE_MAPPING, COLUMN_TYPE_NUMBERICAL_WITH_DATETIME_LIKE, COLUMN_TYPE_NUMBERS } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import {
  GRAY_LINES,
  LIGHT,
  PURPLE,
  PURPLE_HIGHLIGHT,
  SILVER,
  WHITE,
} from '@oracle/styles/colors/main';
import { PADDING, UNIT } from '@oracle/styles/units/spacing';
import { roundNumber } from '@utils/string';

export const ContainerStyle = styled.div`
  border: 1px solid ${GRAY_LINES};
  border-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const HeaderStyle = styled.div`
  background: ${SILVER};
  padding: ${PADDING}px;
  border-bottom: 1px solid ${GRAY_LINES};
  border-top-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-top-right-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const FeatureProfileStyle = styled.div`
  border-bottom: 1px solid ${GRAY_LINES};
`;

export const BodyStyle = styled.div`
  height: 500px;
  border-bottom-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-bottom-right-radius: ${BORDER_RADIUS_LARGE}px;
  overflow-y: scroll;
`;

export const CellStyle = styled.div<any>`
  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}
  padding: ${UNIT}px;
`;

type FeatureProfileProps = {
  feature: FeatureType,
  statistics: any,
};

type FeatureProfilesProps = {
  features: FeatureType[],
  statistics: any,
};

function FeatureProfile({
  feature,
  statistics,
}: FeatureProfileProps) {
  const {
    columnType,
    uuid
  } = feature;

  const numberOfValues = statistics?.[`${uuid}/count`];
  const numberOfUniqueValues = statistics?.[`${uuid}/count_distinct`];
  const numberOfNullValues = statistics?.[`${uuid}/null_value_count`];
  // const nullValueRate = statistics?.[`${uuid}/null_value_rate`];
  const maxValue = statistics?.[`${uuid}/max`];
  const minValue = statistics?.[`${uuid}/min`];
  const meanValue = statistics?.[`${uuid}/average`];
  const medianValue = statistics?.[`${uuid}/median`];
  const modeValue = statistics?.[`${uuid}/mode`];
  const numberOfInvalidValues = statistics?.[`${uuid}/invalid_value_count`];

  let entries = []
  
  if (COLUMN_TYPE_NUMBERICAL_WITH_DATETIME_LIKE.includes(columnType)) {
    entries = [
      [
        'Type',
        'Count',
        'Unique',
        'Missing',
      ],
      [
        COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType] || columnType,
        numberOfValues,
        numberOfUniqueValues,
        numberOfNullValues,
      ],
      [
        columnType === COLUMN_TYPE_DATETIME ? 'Median' : 'Mean',
        'Minimum',
        'Maximum',
        'Invalid',
      ],
      [
        columnType === COLUMN_TYPE_DATETIME ? medianValue : roundNumber(meanValue, 3),
        typeof minValue === 'string' ? minValue: roundNumber(minValue, 3),
        typeof maxValue === 'string' ? maxValue: roundNumber(maxValue, 3),
        numberOfInvalidValues,
      ]
    ]
  } else {
    entries = [
      [
        'Type',
        'Count',
        'Unique',
      ],
      [
        COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType] || columnType,
        numberOfValues,
        numberOfUniqueValues,
      ],
      [
        'Missing',
        'Mode',
        'Invalid',
      ],
      [
        numberOfNullValues,
        modeValue,
        numberOfInvalidValues,
      ]
    ]
  }

  return (
    <FlexContainer>
      <Flex flex={1}>
        <CellStyle>
          <Text backgroundColor={PURPLE_HIGHLIGHT} bold color={PURPLE} monospace>
            {uuid}
          </Text>
        </CellStyle>
      </Flex>
      {entries.map((values) => (
        <>
          <Flex flex={1} flexDirection="column">
            {values.map((label, idx) => (
              <CellStyle backgroundColor={idx % 2 === 0 ? WHITE : LIGHT}>
                <Text>
                  {label}
                </Text>
              </CellStyle>
            ))}
          </Flex>
        </>
      ))}
    </FlexContainer>
  )
}

function FeatureProfiles({
  features,
  statistics,
}: FeatureProfilesProps) {
  return (
    <ContainerStyle>
      <HeaderStyle>
        <Text bold>
          Feature Profiles
        </Text>
      </HeaderStyle>
      <BodyStyle>
        {features.map(feature => (
          <FeatureProfileStyle>
            <FeatureProfile
              feature={feature}
              statistics={statistics}
            />
          </FeatureProfileStyle>
        ))}
      </BodyStyle>
    </ContainerStyle>
  )
}

export default FeatureProfiles;