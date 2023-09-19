import BlockRunType from '@interfaces/BlockRunType';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import { OutputType } from '@interfaces/BlockType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { TABLE_COLUMN_HEADER_HEIGHT } from '@components/Sidekick/index.style';
import { TABS_HEIGHT_OFFSET } from '@components/PipelineRun/shared/buildTableSidekick';
import { createBlockStatus } from '@components/Triggers/utils';
import { isJsonString } from '@utils/string';

export const TAB_TREE = { uuid: 'Dependency tree' };
export const TAB_OUTPUT = { uuid: 'Block output' };
export const TABS = [
  TAB_OUTPUT,
  TAB_TREE,
];

const MAX_COLUMNS = 40;

// eslint-disable-next-line import/no-anonymous-default-export
export default function({
  blockRuns,
  columns,
  dataType,
  height,
  heightOffset,
  loadingData,
  outputs,
  pipeline,
  renderColumnHeader,
  rows,
  selectedRun,
  selectedTab,
  setSelectedTab,
  textData,
  ...props
}: {
  blockRuns: BlockRunType[];
  columns: string[],
  dataType: DataTypeEnum,
  height: number;
  heightOffset?: number;
  loadingData?: boolean;
  outputs?: OutputType[];
  pipeline: PipelineType;
  renderColumnHeader?: (column: any, idx: number, opts: {
    width: number;
  }) => any;
  rows: string[][] | number[][];
  selectedRun?: BlockRunType;
  selectedTab?: TabType;
  setSelectedTab?: (tab: TabType) => void;
  showDynamicBlocks?: boolean;
  textData?: string;
}) {
  const updatedProps = { ...props };
  updatedProps['blockStatus'] = createBlockStatus(blockRuns);

  const arr = [];
  const tabsMoreInner = [];

  if (!loadingData) {
    outputs?.forEach(({
      sample_data: blockSampleData,
      text_data: textData,
      type: dataType,
    }, idx: number) => {
      const emptyOutputMessageEl = (
        <Spacing key={`output-empty-${idx}`} ml={2}>
          <Text>
            This block run has no output.
          </Text>
        </Spacing>
      );

      tabsMoreInner.push({
        uuid: `Block output ${idx + 1}`,
      });

      if (dataType === DataTypeEnum.TABLE) {
        const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
        const rows = blockSampleData?.rows || [];


        if (rows && rows?.length >= 1) {
          arr.push(
            <DataTable
              columnHeaderHeight={renderColumnHeader ? TABLE_COLUMN_HEADER_HEIGHT : 0}
              columns={columns}
              height={height - heightOffset - 90}
              key={`output-table-${idx}`}
              noBorderBottom
              noBorderLeft
              noBorderRight
              renderColumnHeader={renderColumnHeader}
              rows={rows}
            />,
          );
        } else {
          arr.push(emptyOutputMessageEl);
        }

      } else {
        const parsedText = isJsonString(textData)
          ? JSON.stringify(JSON.parse(textData), null, 2)
          : textData;

        const blockOutputText = !!textData
          ? (
            <Spacing key={`output-text-${idx}`} ml={2}>
              <Text monospace>
                <pre>
                  {parsedText}
                </pre>
              </Text>
            </Spacing>
          )
          : emptyOutputMessageEl;

        arr.push(blockOutputText);
      }
    });
  }

  const outputEls = arr;
  const tabsMore = tabsMoreInner;

  let tabsUse = TABS;
  if (tabsMore?.length >= 2) {
    tabsUse = [
      TAB_OUTPUT,
      ...tabsMore.slice(1),
      TAB_TREE,
    ];
  }

  const showTabs = selectedTab && setSelectedTab;
  const idx = tabsUse.findIndex(({ uuid }) => uuid === selectedTab?.uuid);
  const blockOutputToShow = outputEls[idx];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '50px',
        }}
      >
        {showTabs && (
          <Spacing py={PADDING_UNITS}>
            <ButtonTabs
              onClickTab={setSelectedTab}
              selectedTabUUID={selectedTab?.uuid}
              tabs={selectedRun ? tabsUse : [TAB_TREE]}
            />
          </Spacing>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          top: '75px',
        }}
      >
        {(!selectedRun || TAB_TREE.uuid === selectedTab?.uuid) && (
          <DependencyGraph
            {...updatedProps}
            height={height}
            heightOffset={(heightOffset || 0) + (showTabs ? TABS_HEIGHT_OFFSET : 0)}
            pipeline={pipeline}
          />
        )}

        {selectedRun && selectedTab && TAB_TREE.uuid !== selectedTab?.uuid && (
          <>
            {loadingData && (
              <Spacing mt={2}>
                <FlexContainer alignItems="center" fullWidth justifyContent="center">
                  <Spinner color="white" large/>
                </FlexContainer>
              </Spacing>
            )}
            {!loadingData && blockOutputToShow}
          </>
        )}
      </div>
    </>
  );
}
