import React from 'react';
import NextLink from 'next/link';
import styled from 'styled-components';

import FeatureType, {
  ColumnTypeEnum,
  COLUMN_TYPE_HUMAN_READABLE_MAPPING,
  COLUMN_TYPE_NUMBERICAL_WITH_DATETIME_LIKE,
} from '@interfaces/FeatureType';
import FeatureSetType from '@interfaces/FeatureSetType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
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
import { getFeatureIdMapping } from '@utils/models/featureSet';
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
  featureSet: FeatureSetType,
  statistics: any,
};

type FeatureProfilesProps = {
  features: FeatureType[],
  featureSet: FeatureSetType,
  statistics: any,
};

function FeatureProfile({
  feature,
  featureSet,
  statistics,
}: FeatureProfileProps) {
  const {
    columnType,
    uuid,
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

  let entries = [];
  
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
        columnType === ColumnTypeEnum.DATETIME ? 'Median' : 'Mean',
        'Minimum',
        'Maximum',
        'Invalid',
      ],
      [
        columnType === ColumnTypeEnum.DATETIME ? medianValue : roundNumber(meanValue, 3),
        typeof minValue === 'string' ? minValue: roundNumber(minValue, 3),
        typeof maxValue === 'string' ? maxValue: roundNumber(maxValue, 3),
        numberOfInvalidValues,
      ],
    ];
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
      ],
    ];
  }

  const featureSetId = featureSet.id;
  const featureUuid = feature?.uuid;
  const featureId = getFeatureIdMapping(featureSet)[featureUuid]

  return (
    <FlexContainer>
      <Flex flex={1}>
        <CellStyle>
          <NextLink
            as={`/datasets/${featureSetId}/features/${featureId}`}
            href="/datasets/[...slug]"
            key={featureUuid}
            passHref
          >
            <Link inline>
              <Text backgroundColor={PURPLE_HIGHLIGHT} bold color={PURPLE} monospace>
                {uuid}
              </Text>
            </Link>
          </NextLink>
        </CellStyle>
      </Flex>
      {entries.map((values, idx) => (
        <Flex flex={1} flexDirection="column" key={`column-${idx}`}>
          {values.map((label, idx) => (
            <CellStyle backgroundColor={idx % 2 === 0 ? WHITE : LIGHT} key={idx}>
              <Text>
                {label}
              </Text>
            </CellStyle>
          ))}
        </Flex>
      ))}
    </FlexContainer>
  );
}

function FeatureProfiles({
  features,
  featureSet,
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
        {features.map((feature, idx) => (
          <FeatureProfileStyle key={idx}>
            <FeatureProfile
              feature={feature}
              featureSet={featureSet}
              statistics={statistics}
            />
          </FeatureProfileStyle>
        ))}
      </BodyStyle>
    </ContainerStyle>
  );
}

export default FeatureProfiles;
