import React, { useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

import FeatureType, { ColumnTypeEnum, COLUMN_TYPE_HUMAN_READABLE_MAPPING } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import {
  GRAY_LINES,
  SILVER,
} from '@oracle/styles/colors/main';
import { PADDING, UNIT } from '@oracle/styles/units/spacing';
import { formatPercent, pluralize, roundNumber } from '@utils/string';
import { getFeatureStatistics } from '@utils/models/featureSet';
import { goToWithQuery } from '@utils/routing';
import RowDataTable from '@oracle/components/RowDataTable';

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
  padding: ${UNIT * 1.75}px ${PADDING}px;
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

export const ScrollOverflowStyle = styled.div`
  overflow-x: scroll;
`;

type FeatureProfileProps = {
  columns: string[];
  feature: FeatureType,
  statistics: any,
};

type FeatureProfilesProps = {
  features: FeatureType[],
  statistics: any,
};

const entryTypes = [
  'Type',
  'Missing',
  'Unique',
  'Min',
  'Max',
  'Mean',
  'Median',
  'Mode',
  'Invalid',
  'Outliers',
  'Skewness',
  'Std dev',
];

// % thresholds, above which we warn the user
// TODO refactor to use StatsTable.WarningType
const warnings = {
  'Missing': 0,
  'Invalid': 0,
  'Outliers': 0,
  'Unique': 0.9,
};

function FeatureProfile({
  columns,
  feature,
  statistics,
}: FeatureProfileProps) {
  const themeContext = useContext(ThemeContext);

  const {
    columnType,
    uuid,
  } = feature;

  const featureSetStats = getFeatureStatistics(statistics, uuid);
  const {
    average: meanValue,
    avg_string_length: avgStringLength,
    avg_word_count: avgWordCount,
    count: rowCount,
    count_distinct: numberOfUniqueValues,
    invalid_value_count: numberOfInvalidValues,
    invalid_value_rate: invalidValueRate,
    max: maxValue,
    max_character_count: maxCharCount,
    max_word_count: maxWordCount,
    min: minValue,
    min_character_count: minCharCount,
    min_word_count: minWordCount,
    median: medianValue,
    mode: modeValue,
    null_value_count: numberOfNullValues,
    null_value_rate: nullValueRate,
    outlier_count: numberOfOutliers,
    skew: skewness,
    std: stddev,
    unique_value_rate: uniqueValueRate,
  } = featureSetStats;

  const entries = [
    columnType,
    numberOfNullValues,
    numberOfUniqueValues,
    minValue,
    maxValue,
    meanValue,
    medianValue,
    modeValue,
    numberOfInvalidValues,
    numberOfOutliers,
    skewness,
    stddev,
  ];

  const textReplacements = {
    'Min': minWordCount,
    'Max': maxWordCount,
    'Mean': avgWordCount,
  };

  const textTooltips = {
    'Min': `${pluralize('character', minCharCount)}`,
    'Max': `${pluralize('character', maxCharCount)}`,
    'Mean': `${pluralize('character', roundNumber(avgStringLength))}`,
  };

  const percentages = {
    'Invalid': formatPercent(invalidValueRate),
    'Missing': formatPercent(nullValueRate),
    'Unique': formatPercent(uniqueValueRate),
  };

  const ColumnTypeIcon = COLUMN_TYPE_ICON_MAPPING[columnType];

  const [ ROW, ROW_ALT ] = [
    themeContext.background.row,
    themeContext.background.row2,
    themeContext.background.table,
  ];

  return (
    <Flex flexDirection="column">
      <FeatureProfileStyle>
        <Spacing px={1} py={2}>
          <FlexContainer alignItems="center">
            {ColumnTypeIcon && 
              <Flex title={COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType]}>
                <ColumnTypeIcon size={UNIT * 2} />
              </Flex>
            }
            <Link
              inline
              onClick={() => goToWithQuery({
                column: columns.indexOf(uuid),
              }, {
                pushHistory: true,
              })}
              preventDefault
              secondary
            >
              <Text
                backgroundColor={(themeContext.feature || light.feature).active}
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
          </FlexContainer>
        </Spacing>
      </FeatureProfileStyle>
      {entries.map((label = '-', idx) => {
        const entry = entryTypes[idx];
        const isTextStat = columnType === ColumnTypeEnum.TEXT && entry in textReplacements;
        const subbedVal = isTextStat ? textReplacements[entry] : label;
        const val = !isNaN(subbedVal) ? roundNumber(subbedVal) : subbedVal;
        const shouldWarn = entry in warnings && (val/rowCount) > warnings[entry];

        return (
          <CellStyle backgroundColor={idx % 2 === 0 ? ROW : ROW_ALT} key={idx}>
            <Text
              bold={shouldWarn}
              danger={shouldWarn}
              default
              textOverflow
              title={isTextStat ? textTooltips[entry] : ''}
            >
              {isTextStat ? `${pluralize('word', val)}` : val}
              {entry in percentages && ` (${percentages[entry]})`}
            </Text>
          </CellStyle>
        );
      })}
    </Flex>
  );
}

function FeatureProfiles({
  features = [],
  statistics,
}: FeatureProfilesProps) {
  const themeContext = useContext(ThemeContext);
  const columns = useMemo(() => features.map(({ uuid }) => uuid), [features]);

  return (
    <RowDataTable
      headerTitle="Feature profiles"
    >
      <FlexContainer>
        <ColumnProfileStyle>
          <Flex flex={1} flexDirection="column" style={{ background: themeContext.background.table }} >
            <Spacing mr={1.25 * UNIT} mt={'52px'} />
            {entryTypes.map((entry, idx) => (
              <CellStyle key={`${entry}-${idx}`}>
                <Text secondary>{entry}</Text>
              </CellStyle>
            ))}
          </Flex>
        </ColumnProfileStyle>
        <ScrollOverflowStyle>
          <FlexContainer>
            {features.map((feature, idx) => (
              <FeatureProfileStyle key={`${feature}-${idx}`}>
                <FeatureProfile
                  columns={columns}
                  feature={feature}
                  statistics={statistics}
                />
              </FeatureProfileStyle>
            ))}
          </FlexContainer>
        </ScrollOverflowStyle>
      </FlexContainer>
    </RowDataTable>
  );
}

export default FeatureProfiles;
