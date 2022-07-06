import ProgressBar from '@oracle/components/ProgressBar';
import DifferenceButton from '@components/datasets/StatsTable/DifferenceButton';
import Spacing from '@oracle/elements/Spacing';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Text from '@oracle/elements/Text';
import { formatPercent } from '@utils/string';

export enum SuccessDirectionEnum {
  INCREASE = 'increase',
  DECREASE = 'decrease',
}

export type StatRow = {
  change?: number,
  columnFlexNumbers?: number[],
  name: string,
  progress?: boolean,
  rate?: number,
  successDirection?: SuccessDirectionEnum,
  value?: any,
  warning?: WarningType;
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
      {stats?.map(({
        change,
        columnFlexNumbers,
        name,
        progress,
        rate,
        successDirection = SuccessDirectionEnum.INCREASE,
        value,
        warning,
      }, idx) => {
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
          <RowCard
            columnFlexNumbers={columnFlexNumbers || [1, 1, 1]}
            condensed={!!change}
            key={`${name}_${idx}`}
          >
            <Text default>{name}</Text>
            <>
              {value !== undefined &&
                <Spacing pr={1}>
                  <Text default {...warn}>
                    {value}
                  </Text>
                </Spacing>
              }
              {rate !== undefined &&
                <Spacing pr={1}>
                  <Text default {...warn}>
                    {stylePercent(value, rate)}
                  </Text>
                </Spacing>
              }
              {(change < 0 || change > 0) &&
                <Spacing pr={1}>
                  <DifferenceButton
                    danger={successDirection === SuccessDirectionEnum.DECREASE
                      ? change > 0
                      : change < 0}
                    decrease={change < 0}
                    increase={change > 0}
                    percentage={Math.abs(change)}
                    success={successDirection === SuccessDirectionEnum.INCREASE
                      ? change > 0
                      : change < 0}
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
