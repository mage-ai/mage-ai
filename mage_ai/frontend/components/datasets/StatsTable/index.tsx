import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import ProgressBar from '@oracle/components/ProgressBar';
import ProgressIcon from '@oracle/components/ProgressIcon';
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
  flex?: number[],
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
      {stats?.map(({ name, value, rate, progress, warning, change, flex }) => {
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
          <RowCard columnFlexNumbers={flex || [2, 1, 2, 1]} key={name}>
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
            {progress
              ?
                <ProgressBar
                  progress={rate * 100}
                  {...warn}
                />
              :
                <> </>
            }
            { change
              ?
                <FlexContainer alignItems="center">
                  &nbsp;
                  {console.log(name, change)}
                  <ProgressIcon danger={change < 0} percentage={Math.abs(change)}/>
                </FlexContainer>
              :
                <> </>
            }
          </RowCard>
        );
      })}
    </RowDataTable>
  );
}

export default StatsTable;
