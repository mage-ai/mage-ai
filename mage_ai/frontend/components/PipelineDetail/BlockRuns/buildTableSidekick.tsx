import { useMemo } from 'react';

import BlockRunType from '@interfaces/BlockRunType';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { TABLE_COLUMN_HEADER_HEIGHT } from '@components/Sidekick/index.style';
import { createBlockStatus } from '@components/Triggers/utils';

export default function({
  blockRuns,
  columns,
  height,
  heightOffset,
  loadingData,
  pipeline,
  renderColumnHeader,
  rows,
  selectedRun,
  ...props
}: {
  blockRuns: BlockRunType[];
  columns: string[],
  height: number;
  heightOffset?: number;
  loadingData?: boolean;
  pipeline: PipelineType;
  renderColumnHeader?: (column: any, idx: number, opts: {
    width: number;
  }) => any;
  rows: string[][] | number[][];
  selectedRun?: BlockRunType;
}) {

  const updatedProps = { ...props };
  updatedProps['blockStatus'] = createBlockStatus(blockRuns);

  const blockOutputTable = useMemo(() => (
    <>
      {rows && rows.length > 0 ? (
        <DataTable
          columnHeaderHeight={renderColumnHeader ? TABLE_COLUMN_HEADER_HEIGHT : 0}
          columns={columns}
          height={height - heightOffset - 90}
          noBorderBottom
          noBorderLeft
          noBorderRight
          renderColumnHeader={renderColumnHeader}
          rows={rows}
        />
      ) : (
        <Spacing ml={2}>
          <Text>
            This block run has no output
          </Text>
        </Spacing>
      )}
    </>
  ), [
    columns,
    height,
    heightOffset,
    renderColumnHeader,
    rows,
  ]);

  return (
    <>
      {!selectedRun && (
        <DependencyGraph
          {...updatedProps}
          height={height}
          heightOffset={(heightOffset || 0)}
          pipeline={pipeline}
        />
      )}

      {selectedRun && (
        <>
          <Spacing
            pl={2}
            py={3}
            style={{ position: 'fixed' }}
          >
            <Headline level={4} muted>
              Block Output
            </Headline>
          </Spacing>
          <div
            style={{
              position: 'relative',
              top: '75px',
            }}
          >
            {loadingData && (
              <Spacing mt={2}>
                <FlexContainer alignItems="center" fullWidth justifyContent="center">
                  <Spinner color="white" large/>
                </FlexContainer>
              </Spacing>
            )}
            {!loadingData && blockOutputTable}
          </div>
        </>
      )}
    </>
  );
}
