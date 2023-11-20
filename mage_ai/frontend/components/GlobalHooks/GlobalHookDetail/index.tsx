import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalHookType, {
  HookConditionEnum,
  HookOutputKeyEnum,
  HookOutputSettingsType,
  HookStageEnum,
  HookStrategyEnum,
} from '@interfaces/GlobalHookType';
import Link from '@oracle/elements/Link';
import PupelineType from '@interfaces/PupelineType';
import Select from '@oracle/elements/Inputs/Select';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Add, ChevronDown, PaginateArrowRight } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  camelCaseToNormalWithSpaces,
  capitalizeRemoveUnderscoreLower,
  pluralize,
} from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, sortByKey } from '@utils/array';

type GlobalHookDetailProps = {
  globalHook: GlobalHookType;
  pipelines: PupelineType[];
};

function GlobalHookDetail({
  globalHook,
  pipelines: pipelinesProp,
}: GlobalHookDetailProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const [attributes, setAttributesState] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<boolean>(false);

  const pipelines = useMemo(() => sortByKey(pipelinesProp || [], ({ name }) => name), [
    pipelinesProp,
  ]);
  const pipelinesMapping = useMemo(() => indexBy(pipelines || [], ({ uuid }) => uuid), [
    pipelines,
  ]);

  const setAttributes = useCallback((prev) => {
    setAttributesState(prev);
    setAttributesTouched(true);
  }, [
    setAttributesState,
    setAttributesTouched,
  ]);

  useEffect(() => {
    setAttributesState(globalHook);
  }, [
    globalHook,
    setAttributesState,
  ]);

  const resourceOperation: string = useMemo(() => {
    if (attributes?.operation_type && attributes?.resource_type) {
      return `${capitalizeRemoveUnderscoreLower(attributes?.operation_type)} ${attributes?.resource_type} operation`;
    } else if (attributes?.resource_type) {
      return `${attributes?.resource_type} operation`;
    } else if (attributes?.operation_type) {
      return `${attributes?.operation_type} operation`;
    }

    return 'operation';
  }, [
    attributes,
  ]);

  const pipeline = useMemo(() => pipelinesMapping?.[attributes?.pipeline?.uuid], [
    attributes,
    pipelinesMapping,
  ]);
  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const blocksMapping = useMemo(() => indexBy(blocks || [], ({ uuid }) => uuid), [blocks]);
  const outputs = useMemo(() => attributes?.outputs || [], [attributes]);
  const updateOutputAtIndex = useCallback((output: HookOutputSettingsType, idx: number) => {
    const outputsNew = [...(outputs || [])];
    outputsNew[idx] = output;

    setAttributes(prev => ({
      ...prev,
      outputs: outputsNew,
    }));
  }, [
    outputs,
    setAttributes,
  ]);

  const addOutputButtonMemo = useMemo(() => {
    return (
      <Button
        beforeIcon={<Add />}
        compact={outputs?.length >= 1}
        small={outputs?.length >= 1}
        onClick={() => setAttributes(prev => ({
          ...prev,
          outputs: (prev?.outputs || []).concat({
            block: {
              uuid: null,
            },
            key: HookOutputKeyEnum.PAYLOAD,
          }),
        }))}
        primary
      >
        Add block output
      </Button>
    );
  }, [
    outputs,
    setAttributes,
  ]);

  const outputsMemo = useMemo(() => {
    return outputs?.map((output, idx: number) => {
      const {
        block: blockProp,
        key,
        keyMore,
        keys,
      } = output;
      const block = blocksMapping?.[blockProp?.uuid];

      let blockUUIDEl;
      if (block) {
        blockUUIDEl = (
          <NextLink
            as={`/pipelines/${pipeline?.uuid}/edit?block_uuid=${block?.uuid}`}
            href={'/pipelines/[pipeline]/edit'}
            passHref
          >
            <Link
              block
              openNewWindow
            >
              <Text
                color={getColorsForBlockType(
                  block?.type,
                  {
                    blockColor: block?.color,
                    theme: themeContext,
                  },
                ).accent}
                monospace
              >
                {block?.uuid || '[select a block]'}
              </Text>
            </Link>
          </NextLink>
        );
      } else {
        blockUUIDEl = (
          <Text default monospace>
            {block?.uuid || blockProp?.uuid || '[select a block]'}
          </Text>
        );
      }

      return (
        <AccordionPanel
          noBorderRadius
          noPaddingContent
          title={(
            <FlexContainer alignItems="center">
              {blockUUIDEl}

              <Spacing mr={1} />

              <PaginateArrowRight muted />

              <Spacing mr={1} />

              <Text default monospace>
                {key || '{object}'}{keys?.length >= 1 && keys?.map(key2 => (
                  <Text default inline monospace>
                    ['{key2}']
                  </Text>
                ))}
              </Text>
            </FlexContainer>
          )}
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={PADDING_UNITS * UNIT}
        >
          <SetupSectionRow
            title="Block to extract data from"
            description={`The output data from this block will be merged into the ${resourceOperation}’s data.`}
            key={`block-uuid-${idx}`}
            selectInput={{
              monospace: true,
              onChange: e => updateOutputAtIndex({
                ...output,
                block: {
                  ...block,
                  uuid: e.target.value,
                },
              }, idx),
              options: blocks?.map(({
                name,
                uuid,
              }) => ({
                label: name,
                value: uuid,
              })),
              placeholder: 'Select a block',
              value: block?.uuid,
            }}
          />

          <SetupSectionRow
            title="Object to merge block output data into"
            description={`Select the ${resourceOperation} object to merge the block output data into.`}
            key={`key-${idx}`}
            selectInput={{
              monospace: true,
              onChange: e => updateOutputAtIndex({
                ...output,
                key: e.target.value,
              }, idx),
              options: Object.values(HookOutputKeyEnum)?.map(outputKey => ({
                label: outputKey,
                value: outputKey,
              })),
              placeholder: 'Select an object',
              value: key,
            }}
          />

          <SetupSectionRow
            title="Additional dictionary keys"
            description={(
              <Text muted small>
                If there is a nested object or value in the ${resourceOperation} data
                that you want to merge the block output data into,
                <br />
                use these additional keys to instruct the hook on how nested you want
                to merge the block output data.
              </Text>
            )}
            key={`keys-${idx}`}
            textInput={{
              fullWidth: false,
              monospace: true,
              placeholder: 'optional',
              onChange: e => updateOutputAtIndex({
                ...output,
                keyMore: e.target.value,
              }, idx),
              value: keyMore,
            }}
          >
            {keys?.map(key2 => (
              <Spacing
                key={`keys-${idx}-${key2}`}
                ml={1}
              >
                <Chip
                  border
                  label={key2}
                  monospace
                  onClick={() => {
                    updateOutputAtIndex({
                      ...output,
                      keys: (keys || []).filter(k => k !== key2),
                    }, idx);
                  }}
                />
              </Spacing>
            ))}

            {keys?.length >= 1 && (
              <Spacing mr={PADDING_UNITS} />
            )}

            {keyMore && (
              <>
                <Button
                  compact
                  small
                  onClick={() => {
                    updateOutputAtIndex({
                      ...output,
                      keyMore: '',
                      keys: (keys || []).concat(keyMore),
                    }, idx);
                  }}
                >
                  Add key {keyMore}
                </Button>

                <Spacing mr={PADDING_UNITS} />
              </>
            )}
          </SetupSectionRow>
        </AccordionPanel>
      );
    });
  }, [
    blocks,
    blocksMapping,
    outputs,
    pipeline,
    updateOutputAtIndex,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <SetupSection title="What to run hook for">
        <SetupSectionRow
          description="This hook’s UUID must be unique across all hooks for the same resource type and operation type."
          invalid={attributesTouched && !attributes?.uuid}
          textInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              uuid: e.target.value,
            })),
            placeholder: 'e.g. bootstrap pipeline blocks',
            value: attributes?.uuid,
          }}
          title="Hook UUID"
        />

        <SetupSectionRow
          description="Select the resource this hook should be attached to."
          invalid={attributesTouched && !attributes?.resource_type}
          placeholder="e.g. Pipeline"
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              resource_type: e.target.value,
            })),
            options: attributes?.resource_types?.map(resourceType => ({
              label: camelCaseToNormalWithSpaces(resourceType),
              value: resourceType,
            })),
            value: attributes?.resource_type,
          }}
          title="Resource type"
        />

        <SetupSectionRow
          description="When a specific operation occurs for a given resource, this hook will be invoked for that specific operation on the configured resource."
          invalid={attributesTouched && !attributes?.operation_type}
          placeholder="e.g. Update"
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              operation_type: e.target.value,
            })),
            options: attributes?.operation_types?.map(value => ({
              label: capitalizeRemoveUnderscoreLower(value),
              value,
            })),
            value: attributes?.operation_type,
          }}
          title="Operation type"
        />

        <Accordion
          noBorder
          noBoxShadow
        >
          <AccordionPanel
            noBorderRadius
            noPaddingContent
            title="Targeting"
            titleXPadding={PADDING_UNITS * UNIT}
            titleYPadding={PADDING_UNITS * UNIT}
          >
            <Spacing p={PADDING_UNITS}>
              <Text default>
                Add targeting conditions to determine what subset of {attributes?.resource_type
                  ? pluralize(camelCaseToNormalWithSpaces(attributes?.resource_type), 2, null, true)
                  : 'resources'
                } this hook should run for.
              </Text>

            {/* TODO: add */}
            </Spacing>
          </AccordionPanel>
        </Accordion>
      </SetupSection>

      <Spacing mb={PADDING_UNITS} />

      <SetupSection title="When to run hook">
        <SetupSectionRow
          title={`Before operation starts`}
          description={`If enabled, this hook will be invoked before the ${resourceOperation} starts.`}
          toggleSwitch={{
            checked: attributes?.stages?.includes(HookStageEnum.BEFORE),
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              stages: valFunc(prev?.stages?.includes(HookStageEnum.BEFORE))
                ? Array.from(new Set(...[(prev?.stages || []).concat(HookStageEnum.BEFORE)]))
                : prev?.stages?.filter(value => value !== HookStageEnum.BEFORE) || [],
            })),
          }}
        />

        <SetupSectionRow
          title={`After operation completes`}
          description={`If enabled, this hook will be invoked after the ${resourceOperation} ends.`}
          toggleSwitch={{
            checked: attributes?.stages?.includes(HookStageEnum.AFTER),
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              stages: valFunc(prev?.stages?.includes(HookStageEnum.AFTER))
                ? Array.from(new Set(...[(prev?.stages || []).concat(HookStageEnum.AFTER)]))
                : prev?.stages?.filter(value => value !== HookStageEnum.AFTER) || [],
            })),
          }}
        />

        <SetupSectionRow
          title={`Run if ${resourceOperation} succeeds`}
          description={`If enabled, this hook will be invoked if the ${resourceOperation} is successful and doesn’t error.`}
          toggleSwitch={{
            checked: attributes?.conditions?.includes(HookConditionEnum.SUCCESS),
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              conditions: valFunc(prev?.conditions?.includes(HookConditionEnum.SUCCESS))
                ? Array.from(new Set(...[(prev?.conditions || []).concat(HookConditionEnum.SUCCESS)]))
                : prev?.conditions?.filter(value => value !== HookConditionEnum.SUCCESS) || [],
            })),
          }}
        />

        <SetupSectionRow
          title={`Run if ${resourceOperation} fails`}
          description={`If enabled, this hook will be invoked if the ${resourceOperation} fails with an error.`}
          toggleSwitch={{
            checked: attributes?.conditions?.includes(HookConditionEnum.FAILURE),
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              conditions: valFunc(prev?.conditions?.includes(HookConditionEnum.FAILURE))
                ? Array.from(new Set(...[(prev?.conditions || []).concat(HookConditionEnum.FAILURE)]))
                : prev?.conditions?.filter(value => value !== HookConditionEnum.FAILURE) || [],
            })),
          }}
        />
      </SetupSection>

      <Spacing mb={PADDING_UNITS} />

      <SetupSection title="How to run hook">
        <SetupSectionRow
          title="Stop operation if hook fails"
          description={`If enabled, the ${resourceOperation} will be cancelled and an error will be raised.`}
          toggleSwitch={{
            checked: attributes?.strategies?.includes(HookStrategyEnum.RAISE),
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              strategies: valFunc(prev?.strategies?.includes(HookStrategyEnum.RAISE))
                ? Array.from(new Set(...[(prev?.strategies || []).concat(HookStrategyEnum.RAISE)]))
                : prev?.strategies?.filter(value => value !== HookStrategyEnum.RAISE) || [],
            })),
          }}
        />

        <SetupSectionRow
          title="Execute hook with history and logging"
          description={(
            <Text muted small>
              If enabled, anytime this hook is executed an associated pipeline run and
              block runs will be created.
              <br />
              This will provide a history of the hook execution as well as logging for observability.
              <br />
              However, this will have a significant impact on the {resourceOperation} resolution time.
              <br />
              This may cause very delayed API responsed and a degraded devloper experience.
            </Text>
          )}
          toggleSwitch={{
            checked: !!attributes?.run_settings?.with_trigger,
            onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
              ...prev,
              run_settings: {
                ...prev?.run_settings,
                with_trigger: valFunc(prev?.run_settings?.with_trigger),
              },
            })),
          }}
        />

        <SetupSectionRow
          title="Pipeline to execute"
          description="Select a pipeline that will be executed every time this hook is triggered."
          invalid={attributesTouched && !attributes?.pipeline?.uuid}
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              pipeline: {
                ...prev?.pipeline,
                uuid: e.target.value,
              },
            })),
            options: pipelines?.map(({
              name,
              uuid,
            }) => ({
              label: name || uuid,
              value: uuid,
            })),
            value: attributes?.resource_type,
          }}
        />
      </SetupSection>

      <Spacing mb={PADDING_UNITS} />

      <SetupSection
        title={`Block outputs ${outputs?.length >= 1 ? `(${outputs?.length || 0})` : ''}`}
        description={(
          <Spacing mt={1}>
            <Text muted>
              When a hook runs and executes a pipeline,
              the output from the pipeline’s blocks
              <br />
              can optionally be used to mutate the {resourceOperation} input and output data.
            </Text>
          </Spacing>
        )}
        headerChildren={outputs?.length >= 1 && (
          <>
            <Spacing ml={PADDING_UNITS} />

            {addOutputButtonMemo}
          </>
        )}
      >
        {!outputs?.length && (
          <Spacing p={PADDING_UNITS}>
            {addOutputButtonMemo}
          </Spacing>
        )}

        {outputs?.length >= 1 && (
          <Accordion noBorder noBoxShadow>
            {outputsMemo}
          </Accordion>
        )}
      </SetupSection>
    </Spacing>
  );
}

export default GlobalHookDetail;
