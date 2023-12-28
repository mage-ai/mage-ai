import { useEffect, useMemo, useState } from 'react';

import BookmarkValues, { BookmarkValuesMapping } from '../BookmarkValues';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import OverwriteVariables from '../OverwriteVariables';
import Panel from '@oracle/components/Panel';
import PipelineScheduleType, {
  VARIABLE_BOOKMARK_VALUES_KEY,
} from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { TAB_BOOKMARK_VALUES, TAB_RUNTIME_VARIABLES, getTabs } from './constants';
import { blocksWithStreamsWithIncrementalReplicationMethod } from '@utils/models/pipeline';
import { parseVariables } from '@components/Sidekick/utils';
import { randomNameGenerator } from '@utils/string';

type RunPipelinePopupProps = {
  initialPipelineSchedulePayload: PipelineScheduleType,
  onCancel: () => void;
  onSuccess: (
    payload: { pipeline_schedule: PipelineScheduleType },
  ) => void;
  pipeline: PipelineType;
  variables?: { [keyof: string]: string };
};

const BUTTON_PADDING = `${UNIT}px ${UNIT * 3}px`;

function RunPipelinePopup({
  initialPipelineSchedulePayload,
  onCancel,
  onSuccess,
  pipeline,
  variables,
}: RunPipelinePopupProps) {
  const [bookmarkValues, setBookmarkValues] = useState<{BookmarkValuesMapping}>(null);

  const [enableVariablesOverwrite, setEnableVariablesOverwrite] = useState<boolean>(true);
  const [runtimeVariables, setRuntimeVariables] = useState<{
    [keyof: string]: string,
  }>(variables || {});
  const [selectedTab, setSelectedTab] = useState(null);

  const finalPipelineSchedulePayload = useMemo(() => ({
    ...initialPipelineSchedulePayload,
    name: randomNameGenerator(),
    variables: enableVariablesOverwrite
      ? parseVariables({
        ...runtimeVariables,
        ...(bookmarkValues ? {
          [VARIABLE_BOOKMARK_VALUES_KEY]: bookmarkValues,
        } : {}),
      })
      : null,
  }), [
    bookmarkValues,
    initialPipelineSchedulePayload,
    enableVariablesOverwrite,
    runtimeVariables,
  ]);

  const blocksWithStreamsMapping = useMemo(() => pipeline?.blocks
    ? blocksWithStreamsWithIncrementalReplicationMethod(pipeline)
    : null,
  [
    pipeline,
  ]);

  const tabs = useMemo(() => blocksWithStreamsMapping
    && Object.keys(blocksWithStreamsMapping || {})?.length >= 1
      ? getTabs()
      : null,
  [
    blocksWithStreamsMapping,
  ]);

  useEffect(() => {
    if (tabs?.length >= 1 && !selectedTab) {
      setSelectedTab(tabs?.[0]);
    }
  }, [
    selectedTab,
    setSelectedTab,
    tabs,
  ]);

  const buttonTabsMemo = useMemo(() => {
    if (!tabs?.length) {
      return null;
    }

    return (
      <ButtonTabs
        onClickTab={(tab: TabType) => {
          setSelectedTab(tab);
        }}
        selectedTabUUID={selectedTab?.uuid}
        tabs={tabs}
        underlineStyle
      />
    );
  }, [
    selectedTab,
    setSelectedTab,
    tabs,
  ]);

  return (
    <Panel
      noPadding
      footer={
        <FlexContainer
          alignItems="center"
          fullWidth
          justifyContent="flex-end"
        >
          <Button
            onClick={() => {
              onSuccess({
                pipeline_schedule: finalPipelineSchedulePayload,
              });
              onCancel();
            }}
            padding={BUTTON_PADDING}
            primaryAlternate
          >
            Run now
          </Button>
          <Spacing mr={1} />
          <Button
            borderColor={dark.background.page}
            onClick={onCancel}
            padding={BUTTON_PADDING}
            secondary
          >
            Cancel
          </Button>
        </FlexContainer>
      }
      header={
        <Headline level={5}>
          Run pipeline now
        </Headline>
      }
      maxHeight="90vh"
      minWidth={UNIT * 85}
      subtitle={
        <>
          {!tabs?.length && (
            <Spacing p={PADDING_UNITS}>
              <Text default>
                Creates a new trigger and immediately runs the current pipeline once.
              </Text>
            </Spacing>
          )}

          {tabs?.length >= 1 && buttonTabsMemo}

          <Divider light />
        </>
      }
    >
      {(!tabs?.length || TAB_RUNTIME_VARIABLES.uuid === selectedTab?.uuid) && (
        <>
          {tabs?.length >= 1 && (
            <Spacing p={PADDING_UNITS}>
              <Text default>
                Creates a new trigger and immediately runs the current pipeline once.
              </Text>
            </Spacing>
          )}

          <OverwriteVariables
            enableVariablesOverwrite={enableVariablesOverwrite}
            originalVariables={variables}
            runtimeVariables={runtimeVariables}
            setEnableVariablesOverwrite={setEnableVariablesOverwrite}
            setRuntimeVariables={setRuntimeVariables}
          />
        </>
      )}

      {TAB_BOOKMARK_VALUES.uuid === selectedTab?.uuid && (
        <BookmarkValues
          bookmarkValues={bookmarkValues}
          pipeline={pipeline}
          // @ts-ignore
          setBookmarkValues={setBookmarkValues}
        />
      )}
    </Panel>
  );
}

export default RunPipelinePopup;
