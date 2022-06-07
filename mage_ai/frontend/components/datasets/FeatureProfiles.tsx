import React from 'react';
import NextLink from 'next/link';
import styled from 'styled-components';

import FeatureType from '@interfaces/FeatureType';
import FeatureSetType from '@interfaces/FeatureSetType';
import Flex from '@oracle/components/Flex';
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
import Spacing from '@oracle/elements/Spacing';
import { formatPercent, roundNumber } from '@utils/string';
import FlexContainer from '@oracle/components/FlexContainer';
import light from '@oracle/styles/themes/light';

export const ContainerStyle = styled.div`
  border: 1px solid ${GRAY_LINES};
  border-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const ColumnProfileStyle = styled.div`
  background: ${SILVER};
  border-bottom: 1px solid ${GRAY_LINES};
  border-right: 1px solid ${GRAY_LINES};
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

const entryTypes = [
  'Type',
  'Unique',
  'Mean',
  'Median',
  'Mode',
  'Min',
  'Max',
  'Missing',
  'Invalid',
  'Outliers',
  'Skewness',
  'Std dev',
];

const percentages = ['Missing', 'Invalid', 'Unique'];

// % thresholds, above which we warn the user
const warnings = {
  'Missing': 0,
  'Invalid': 0,
  'Outliers': 0,
  'Unique': 0.9,
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
  const numberOfOutliers = statistics?.[`${uuid}/outlier_count`];
  const skewness = statistics?.[`${uuid}/skew`];
  const stddev = statistics?.[`${uuid}/std`];

  const entries = [
    columnType,
    numberOfUniqueValues,
    meanValue,
    medianValue,
    modeValue,
    minValue,
    maxValue,
    numberOfNullValues,
    numberOfInvalidValues,
    numberOfOutliers,
    skewness,
    stddev,
  ];

  const featureSetId = featureSet.id;
  const featureUuid = feature?.uuid;
  const featureId = getFeatureIdMapping(featureSet)[featureUuid];

  return (
    <Flex flexDirection="column">
      <FeatureProfileStyle>
        <Spacing p={2}>
          <NextLink
            as={`/datasets/${featureSetId}/features/${featureId}`}
            href="/datasets/[...slug]"
            key={featureUuid}
            passHref
          >
            <Link inline>
              <Text
                backgroundColor={light.feature.active}
                bold
                maxWidth={25 * UNIT}
                monospace
                secondary
                textOverflow
                title={uuid}
              >
                {uuid}
              </Text>
            </Link>
          </NextLink>
        </Spacing>
      </FeatureProfileStyle>
      {entries.map((label = '-', idx) => {
        const entry = entryTypes[idx];
        const val = !isNaN(label) ? roundNumber(label) : label;
        const shouldWarn = entry in warnings && (val/numberOfValues) > warnings[entry];

        return (
          <CellStyle backgroundColor={idx % 2 === 0 ? WHITE : LIGHT} key={idx}>
            <Text
              bold={shouldWarn}
              danger={shouldWarn}
              textOverflow
            >
              {val}
              {percentages.includes(entry) && ` (${formatPercent(label/numberOfValues)})`}
            </Text>
          </CellStyle>
        );
      })}
    </Flex>
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
        <FlexContainer>
          <ColumnProfileStyle>
            <Flex flex={1} flexDirection="column" style={{ background: '#F9FAFC' }} >
              <Spacing mr={1.25 * UNIT} mt={'52px'} />
              {entryTypes.map((entry, idx) => (
                <CellStyle key={`${entry}-${idx}`}>
                  <Text secondary>{entry}</Text>
                </CellStyle>
              ))}
            </Flex>
          </ColumnProfileStyle>
          {features.map((feature, idx) => (
            <FeatureProfileStyle key={`${feature}-${idx}`}>
              <FeatureProfile
                feature={feature}
                featureSet={featureSet}
                statistics={statistics}
              />
            </FeatureProfileStyle>
          ))}
        </FlexContainer>
      </BodyStyle>
    </ContainerStyle>
  );
}

export default FeatureProfiles;
