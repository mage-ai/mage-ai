import FeatureSetType from '@interfaces/FeatureSetType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { COLUMN_TYPE_HUMAN_READABLE_MAPPING, COLUMN_TYPE_NUMBERS } from '@interfaces/FeatureType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getFeatureSetStatistics } from '@utils/models/featureSet';
import { transformNumber } from '@utils/number';
import { formatPercent, isInteger, isNumeric, roundNumber } from '@utils/string';
import ProgressBar from '@oracle/components/ProgressBar';
import { greaterThan, lessThan } from '@utils/array';

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
    average,
    completeness,
    count,
    count_distinct: countDistinct,
    invalid_value_count: invalidValueCount,
    invalid_value_rate: invalidValueRate,
    invalid_values: invalidValues,
    max,
    median,
    min,
    mode,
    null_value_count: nullValueCount,
    null_value_rate: nullValueRate,
    outlier_count: outlierCount,
    outliers,
    skew,
    validity,
  } = featureSetStats;

  type StatRow = {
    name: string,
    value?: any,
    rate?: number,
    progress?: boolean,
    warning?: Warning;
  };

  type Warning = {
    compare: (a: number, b: number) => boolean;
    val: number;
  };

  const shouldWarn = (w: Warning, n: number) => w && w.compare(n, w.val);

  const qualityMetrics: StatRow[] = [
    {
      name: 'Validity',
      rate: validity,
      progress: true,
      warning: {
        compare: lessThan,
        val: 0.8,
      },
    },
    {
      name: 'Completeness',
      rate: completeness,
      progress: true,
      warning: {
        compare: lessThan,
        val: 0.8,
      },
    },
  ];

  let columnSummary: StatRow[] = [
    {
      name: 'Column type',
      value: COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType] || columnType,
    },
    {
      name: 'Total values',
      value: count,
    },
    {
      name: 'Unique values',
      value: countDistinct,
      // TODO rate
    },
    {
      name: 'Missing values',
      value: nullValueCount,
      rate: nullValueRate,
      warning: {
        compare: greaterThan,
        val: 0,
      }
    },
    {
      name: 'Invalid values',
      value: invalidValueCount,
      rate: invalidValueRate,
      warning: {
        compare: greaterThan,
        val: 0,
      }
    },
    {
      name: 'Max value',
      value: isNumeric(max) ? roundNumber(max) : max,
    },
    {
      name: 'Min value',
      value: isNumeric(min) ? roundNumber(min) : min,
    },
    {
      name: 'Median value',
      value: isNumeric(median) ? roundNumber(median) : median,
    },
    {
      name: 'Average value',
      value: isNumeric(average) ? roundNumber(average) : average,
    },
    {
      name: 'Mode value',
      value: isNumeric(mode) ? roundNumber(mode) : mode,
    },
  ];

  columnSummary = columnSummary.filter(({ value }) => value !== undefined);

  const warningMetrics: StatRow[] = [
    {
      name: 'Outliers',
      value: outlierCount,
      // TODO rate
    },
    {
      name: 'Skewness',
      value: skew?.toFixed(3),
    },
  ];

  const showOutliers = outliers && outlierCount > 0;
  const showInvalidValues = invalidValues && invalidValueCount > 0;

  const noWarningMetrics = warningMetrics.every(
    ({ value }) => value === undefined,
  );

  type StatsTableProps = {
    stats: StatRow[],
    title: string,
  };

  const StatsTable = ({ stats, title }: StatsTableProps) => (
    <RowDataTable alternating headerTitle={title}>
      {stats?.map(({ name, value, rate, progress, warning }) => {
        const warn = {
          bold: shouldWarn(warning, rate),
          danger: shouldWarn(warning, rate),
        };

        const stylePercent = (value, rate) => (
          value !== undefined
            ? `(${formatPercent(rate)})`
            : formatPercent(rate)
        );

        return (
          <RowCard columnFlexNumbers={[2,1,2]} key={name}>
            <Text>{name}</Text>
            <Flex>
              {value !== undefined &&
                <Text {...warn}>
                  {value}
                </Text>
              }
              &nbsp;
              {rate !== undefined &&
                <Text {...warn}>
                  {stylePercent(value, rate)}
                </Text>
              }
            </Flex>
            {progress &&
              <ProgressBar
                progress={rate*100}
                {...warn}
              />
            }
          </RowCard>
        );
      })}
    </RowDataTable>
  );

  return (
    <FlexContainer justifyContent="center" responsive>
      <Flex flex={1} flexDirection="column">
        <StatsTable stats={qualityMetrics} title="Quality metrics" />
        <StatsTable stats={columnSummary} title="Statistics" />
      </Flex>

      <Spacing ml={PADDING_UNITS} />

      <Flex flex={1} flexDirection="column">
        {noWarningMetrics
          ?
            <Panel fullHeight={false} headerTitle="Warnings">
              <Text>There are no warnings.</Text>
            </Panel>
          :
            <StatsTable stats={warningMetrics} title="Warnings" />
        }

        {showOutliers &&
          <RowDataTable
            alternating
            headerTitle="Outliers"
          >
            {outliers?.map((outlier, idx) => (
              <RowCard key={`outlier_${idx}`}>
                <Text>
                  {COLUMN_TYPE_NUMBERS.includes(columnType)
                    ? transformNumber(outlier, 2)
                    : outlier
                  }
                </Text>
              </RowCard>
            ))}
          </RowDataTable>
        }

        {showInvalidValues &&
          <Spacing mt={PADDING_UNITS}>
            <RowDataTable
              headerTitle="Invalid values"
            >
              {invalidValues?.map((val, idx) => (
                <RowCard
                  key={`invalid_val_${idx}`}
                  last={idx === invalidValues.length - 1}
                  secondary={idx % 2 === 1}
                >
                  <Text>
                    {val}
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
