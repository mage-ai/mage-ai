import Flex from '@oracle/components/Flex';
import ProgressBar from '@oracle/components/ProgressBar';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Text from '@oracle/elements/Text';
import { formatPercent } from '@utils/string';

export type StatRow = {
  name: string,
  value?: any,
  rate?: number,
  progress?: boolean,
  warning?: Warning;
};

export type Warning = {
  compare: (a: number, b: number) => boolean;
  val: number;
};

export type StatsTableProps = {
  stats: StatRow[],
  title: string,
};

const shouldWarn = (w: Warning, n: number) => w && w.compare(n, w.val);

function StatsTable({ stats, title }: StatsTableProps) {
  return (
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
          <RowCard columnFlexNumbers={[2, 1, 2]} key={name}>
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
