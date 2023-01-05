import BlockRunType from '@interfaces/BlockRunType';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import { TABLE_COLUMN_HEADER_HEIGHT } from '@components/Sidekick/index.style';
import { createBlockStatus } from '@components/Triggers/utils';
import { isJsonString } from '@utils/string';

// eslint-disable-next-line import/no-anonymous-default-export
export default function({
  blockRuns,
  columns,
  dataType,
  height,
  heightOffset,
  loadingData,
  pipeline,
  renderColumnHeader,
  rows,
  selectedRun,
  textData,
  ...props
}: {
  blockRuns: BlockRunType[];
  columns: string[],
  dataType: DataTypeEnum,
  height: number;
  heightOffset?: number;
  loadingData?: boolean;
  pipeline: PipelineType;
  renderColumnHeader?: (column: any, idx: number, opts: {
    width: number;
  }) => any;
  rows: string[][] | number[][];
  selectedRun?: BlockRunType;
  showDynamicBlocks?: boolean;
  textData?: string;
}) {

  const updatedProps = { ...props };
  updatedProps['blockStatus'] = createBlockStatus(blockRuns);

  const emptyOutputMessageEl = (
    <Spacing ml={2}>
      <Text>
        This block run has no output.
      </Text>
    </Spacing>
  );

  const blockOutputTable = (rows && rows.length > 0
    ? (
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
    ) : emptyOutputMessageEl
  );

  const parsedText = isJsonString(textData)
    ? JSON.stringify(JSON.parse(textData), null, 2)
    : textData;
  const blockOutputText = (!!textData
    ? (
      <Spacing ml={2}>
        <Text monospace>
          <pre>
            {parsedText}
          </pre>
        </Text>
      </Spacing>
    )
    : emptyOutputMessageEl
  );

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
            {(!loadingData && dataType === DataTypeEnum.TABLE) && blockOutputTable}
            {(!loadingData && dataType !== DataTypeEnum.TABLE) && blockOutputText}
          </div>
        </>
      )}
    </>
  );
}
