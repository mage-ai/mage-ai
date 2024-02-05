import BlockRunType from '@interfaces/BlockRunType';
import BlockType, { OutputType } from '@interfaces/BlockType';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { TABLE_COLUMN_HEADER_HEIGHT } from '@components/Sidekick/index.style';
import { TABS_HEIGHT_OFFSET } from '@components/PipelineRun/shared/buildTableSidekick';
import { createBlockStatus } from '@components/Triggers/utils';
import { alphabet, isJsonString } from '@utils/string';
import { sortByKey } from '@utils/array';

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
  blocksOverride,
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
  blocksOverride?: BlockType[];
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

  const alpha = alphabet();

  if (!loadingData) {
    const outputsByType = {};

    outputs?.forEach((output) => {
      const dataType = output.type;

      if (!outputsByType[dataType]) {
        outputsByType[dataType] = {
          outputs: [],
          priority: Object.keys(outputsByType).length,
        };
      }

      outputsByType[dataType].outputs.push(output);
    });

    sortByKey(
      Object.entries(outputsByType),
      ([_, d]) => d.priority,
    )?.forEach(([dataTypeInit, d], idx1: number) => {
      const {
        outputs: outputsInGroup,
      } = d;

      const arrGroup = [];

      outputsInGroup?.forEach(({
        sample_data: blockSampleData,
        text_data: textData,
        type: dataType,
      }, idx: number) => {
        const emptyOutputMessageEl = (
          <Spacing key={`output-empty-${idx1}-${idx}`} ml={2}>
            <Text>
              This block run has no output.
            </Text>
          </Spacing>
        );

        let el;

        if (dataType === DataTypeEnum.TABLE) {
          const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
          const rows = blockSampleData?.rows || [];

          if (rows && rows?.length >= 1) {
            el = <DataTable
              columnHeaderHeight={renderColumnHeader ? TABLE_COLUMN_HEADER_HEIGHT : 0}
              columns={columns}
              height={height - heightOffset - 90}
              key={`output-table-${idx1}-${idx}`}
              noBorderBottom
              noBorderLeft
              noBorderRight
              renderColumnHeader={renderColumnHeader}
              rows={rows}
            />;
          } else {
            el = emptyOutputMessageEl;
          }
        } else {
          const parsedText = isJsonString(textData)
            ? JSON.stringify(JSON.parse(textData), null, 2)
            : textData;

          const blockOutputText = (typeof textData !== 'undefined' && textData !== null)
            ? (
              <Spacing key={`output-text-${idx1}-${idx}`} ml={2}>
                <Text monospace>
                  <pre>
                    {parsedText}
                  </pre>
                </Text>
              </Spacing>
            )
            : emptyOutputMessageEl;

          el = blockOutputText;
        }

        const letter = alpha[idx1];

        // If output is text, group them into 1 tab
        if (DataTypeEnum.TEXT === dataTypeInit) {
          arrGroup.push(el);

          if (idx === 0) {
            tabsMoreInner.push({
              uuid: `Block output ${idx + 1}${letter}`,
            });
          }
        } else {
          arr.push(el);

          tabsMoreInner.push({
            uuid: `Block output ${idx + 1}${letter}`,
          });
        }
      });

      if (DataTypeEnum.TEXT === dataTypeInit) {
        arr.push(arrGroup)
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
          top: HEADER_HEIGHT,
        }}
      >
        {showTabs && (
          <>
            <Spacing py={0}>
              <ButtonTabs
                onClickTab={setSelectedTab}
                regularSizeText
                selectedTabUUID={selectedTab?.uuid}
                tabs={selectedRun ? tabsUse : [TAB_TREE]}
                underlineStyle
              />
            </Spacing>
          </>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          top: TABS_HEIGHT_OFFSET,
        }}
      >
        {showTabs && <Divider light />}

        {(!selectedRun || TAB_TREE.uuid === selectedTab?.uuid) && (
          <DependencyGraph
            {...updatedProps}
            blocksOverride={blocksOverride}
            enablePorts={false}
            height={height}
            heightOffset={(heightOffset || 0) + (showTabs ? (TABS_HEIGHT_OFFSET + 1) : 0)}
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
            {!loadingData && (
              <Spacing py={PADDING_UNITS}>
                {blockOutputToShow}
              </Spacing>
            )}
          </>
        )}
      </div>
    </>
  );
}
