import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CodeBlock from '@oracle/components/CodeBlock';
import DependencyGraph from '@components/DependencyGraph';
import PipelineType from '@interfaces/PipelineType';
import PipelineRunType from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Table from '@components/shared/Table';
import {
  PADDING_UNITS,
} from '@oracle/styles/units/spacing';
import { createBlockStatus } from '@components/Triggers/utils';
import { isEmptyObject, isObject } from '@utils/hash';

export const TABS_HEIGHT_OFFSET = 44;
const TAB_DETAILS = { uuid: 'Run details' };
const TAB_TREE = { uuid: 'Dependency tree' };
export const TABS = [
  TAB_TREE,
  TAB_DETAILS,
];


// eslint-disable-next-line import/no-anonymous-default-export
export default function({
  height,
  heightOffset,
  pipeline,
  selectedRun,
  selectedTab,
  setSelectedTab,
  ...props
}: {
  height: number;
  heightOffset?: number;
  pipeline: PipelineType;
  selectedRun?: PipelineRunType;
  selectedTab?: TabType;
  setSelectedTab?: (tab: TabType) => void;
}) {
  const updatedProps = { ...props };

  if (selectedRun) {
    updatedProps['blockStatus'] = createBlockStatus(selectedRun?.block_runs);
  } else {
    updatedProps['noStatus'] = true;
  }

  const pattern = isObject(selectedRun?.variables)
    ? { ...selectedRun?.variables }
    : (selectedRun?.variables || {});
  const eventVariables = selectedRun?.event_variables;
  if (eventVariables && isObject(eventVariables) && !isEmptyObject(eventVariables)) {
    if (isObject(pattern) && pattern.hasOwnProperty('event')) {
      const varsEvent = isObject(pattern.event) ? pattern.event : {};
      // @ts-ignore
      pattern['event'] = { ...varsEvent, ...eventVariables };
    } else {
      pattern['event'] = { ...eventVariables };
    }
  }
  const patternDisplay = [];
  if (pattern) {
    JSON.stringify(pattern, null, 2).split('\n').forEach((line) => {
      patternDisplay.push(`    ${line}`);
    });
  }

  const rows = selectedRun && [
    ['Run ID', selectedRun?.id],
    ['Variables', (
      <CodeBlock
        key="variable_value"
        language="json"
        small
        source={patternDisplay.join('\n')}
      />
    )],
  ];
  const details = selectedRun && (
    <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
      <Table
        alignTop
        columnFlex={[null, 1]}
        columnMaxWidth={(idx: number) => idx === 1 ? '100px' : null}
        rows={rows.map(([k, v], idx) => [
          <Text key={`key_${idx}`} monospace muted>
            {k}
          </Text>,
          <Text
            key={`val_${idx}`}
            monospace
            textOverflow
          >
            {v}
          </Text>,
        ])}
        uuid="LogDetail"
      />
    </Spacing>
  );

  const showTabs = selectedTab && setSelectedTab;

  return (
    <>
      {showTabs && (
        <ButtonTabs
          onClickTab={setSelectedTab}
          selectedTabUUID={selectedTab?.uuid}
          tabs={TABS}
          underlineStyle
        />
      )}

      {(!showTabs || TAB_TREE.uuid === selectedTab?.uuid) && (
        <DependencyGraph
          {...updatedProps}
          height={height}
          heightOffset={(heightOffset || 0) + (showTabs ? TABS_HEIGHT_OFFSET : 0)}
          pipeline={pipeline}
        />
      )}

      {TAB_DETAILS.uuid === selectedTab?.uuid && details}
    </>
  );
}
