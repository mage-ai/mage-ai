import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import ProgressBar from '@oracle/components/ProgressBar';
import DifferenceButton from '@oracle/components/DifferenceButton';
import Spacing from '@oracle/elements/Spacing';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Text from '@oracle/elements/Text';
import { formatPercent } from '@utils/string';

export type StatRow = {
  name: string,
  value?: any,
  rate?: number,
  progress?: boolean,
  warning?: WarningType;
  change?: number,
  columnFlexNumbers?: number[],
};

export type WarningType = {
  compare: (a: number, b: number) => boolean;
  val: number;
};

export type StatsTableProps = {
  stats: StatRow[],
  title: string,
};

const shouldWarn = (w: WarningType, n: number) => w && w.compare(n, w.val);

function StatsTable({ stats, title }: StatsTableProps) {
  return (
    <RowDataTable alternating headerTitle={title}>
      {stats?.map(({ name, value, rate, progress, warning, change, columnFlexNumbers }) => {
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
          <RowCard columnFlexNumbers={columnFlexNumbers || [1, 1, 1]} key={name}>
            <Text>{name}</Text>
            <>
              {value !== undefined &&
                <Spacing pr={1}>
                  <Text {...warn}>
                    {value}
                  </Text>
                </Spacing>
              }
              {rate !== undefined &&
                <Spacing pr={1}>
                  <Text {...warn}>
                    {stylePercent(value, rate)}
                  </Text>
                </Spacing>
              }
              {change &&
                <Spacing pr={1}>
                  <DifferenceButton
                    danger={change < 0}
                    percentage={Math.abs(change)}
                  />
                </Spacing>
              }
            </>
            {progress &&
              <ProgressBar
                progress={rate * 100}
                {...warn}
              />
            }
          </RowCard>
        );
      })}
    </RowDataTable>
  );
}

export default StatsTable;
