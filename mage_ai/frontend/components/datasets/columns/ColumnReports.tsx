import FeatureSetType from '@interfaces/FeatureSetType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { COLUMN_TYPE_HUMAN_READABLE_MAPPING } from '@interfaces/FeatureType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getFeatureSetStatistics } from '@utils/models/featureSet';
import { getPercentage, transformNumber } from '@utils/number';

type ColumnReportsProps = {
  column: string;
  featureSet: FeatureSetType;
};

function ColumnReports({
  column: featureUUID,
  featureSet,
}: ColumnReportsProps) {
  const {
    metadata,
  } = featureSet;
  const columnTypesByFeatureUUID = metadata?.column_types || {};
  const columnType = columnTypesByFeatureUUID[featureUUID];

  const featureSetStats = getFeatureSetStatistics(featureSet, featureUUID);
  const {
    completeness,
    count,
    count_distinct: countDistinct,
    invalid_value_count: invalidValueCount,
    null_value_count: nullValueCount,
    outlier_count: outlierCount,
    outliers,
    skew,
    validity,
  } = featureSetStats;

  const qualityMetrics: {
    columnValues: (string | number | any)[];
    uuid?: string | number;
  }[] = [
    {
      columnValues: [
        'Column type',
        COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType] || columnType,
      ],
    },
    {
      columnValues: [
        'Validity', getPercentage(validity),
      ],
    },
    {
      columnValues: [
        'Completeness', getPercentage(completeness),
      ],
    },
    {
      columnValues: [
        'Total values', count,
      ],
    },
    {
      columnValues: [
        'Unique values', countDistinct,
      ],
    },
    {
      columnValues: [
        'Missing values', nullValueCount,
      ],
    },
    {
      columnValues: [
        'Invalid values', invalidValueCount,
      ],
    },
  ];

  const showOutliers = outliers && outlierCount > 0;
  const warningMetrics = [
    {
      columnValues: [
        'Outliers',
        outlierCount,
      ],
      danger: showOutliers,
    },
    {
      columnValues: [
        'Skewness',
        skew?.toFixed(3),
      ],
    },
  ];
  const noWarningMetrics = warningMetrics.every(
    ({ columnValues }) => (typeof columnValues[1] === 'undefined'),
  );

  return (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        <SimpleDataTable
          columnFlexNumbers={[1, 1]}
          columnHeaders={[{ label: 'Column summary' }]}
          rowGroupData={[{
            rowData: qualityMetrics,
          }]}
        />
      </Flex>

      <Spacing ml={PADDING_UNITS} />

      <Flex flex={1} flexDirection="column">
        {noWarningMetrics
          ?
            <Panel fullHeight={false} headerTitle="Warnings">
              <Text>There are no warnings.</Text>
            </Panel>
          :
            <SimpleDataTable
              columnFlexNumbers={[1, 1]}
              columnHeaders={[{ label: 'Warnings' }]}
              rowGroupData={[{
                rowData: warningMetrics,
              }]}
            />
        }
        {showOutliers &&
          <Spacing mt={PADDING_UNITS}>
            <RowDataTable
              headerTitle="Outliers"
            >
              {outliers?.map((outlier, idx) => (
                <RowCard
                  key={`outlier_${idx}`}
                  last={idx === outliers.length - 1}
                  secondary={idx % 2 === 1}
                >
                  <Text>
                    {transformNumber(outlier, 2)}
                  </Text>
                </RowCard>
              ))}
            </RowDataTable>
          </Spacing>
        }
      </Flex>
    </FlexContainer>
  );
}

export default ColumnReports;
