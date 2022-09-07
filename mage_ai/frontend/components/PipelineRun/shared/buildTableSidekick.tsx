import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CodeBlock from '@oracle/components/CodeBlock';
import DependencyGraph from '@components/DependencyGraph';
import Headline from '@oracle/elements/Headline';
import PipelineType from '@interfaces/PipelineType';
import PipelineRunType from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Table from '@components/shared/Table';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { createBlockStatus } from '@components/Triggers/utils';

const TAB_DETAILS = { uuid: 'Run details' };
const TAB_TREE = { uuid: 'Dependency tree' };
export const TABS = [
  TAB_TREE,
  TAB_DETAILS,
];

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

  const pattern = selectedRun?.variables;
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
        language="json"
        small
        source={patternDisplay.join('\n')}
      />
    )]
  ];
  const details = selectedRun && (
    <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
      <Table
        alignTop
        columnFlex={[null, 1]}
        columnMaxWidth={(idx: number) => idx === 1 ? '100px' : null}
        rows={rows.map(([k, v]) => [
          <Text monospace muted>
            {k}
          </Text>,
          <Text
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
        <Spacing py={PADDING_UNITS}>
          <ButtonTabs
            onClickTab={setSelectedTab}
            selectedTabUUID={selectedTab?.uuid}
            tabs={TABS}
          />
        </Spacing>
      )}

      {(!showTabs || TAB_TREE.uuid === selectedTab?.uuid) && (
        <DependencyGraph
          {...updatedProps}
          height={height}
          heightOffset={(heightOffset || 0) + (showTabs ? 76 : 0)}
          pipeline={pipeline}
        />
      )}

      {TAB_DETAILS.uuid === selectedTab?.uuid && details}
    </>
  );
}
