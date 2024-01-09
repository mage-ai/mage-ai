import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { toast } from 'react-toastify';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalHookType, {
  HookConditionEnum,
  HookOutputKeyEnum,
  HookOutputSettingsType,
  HookStageEnum,
  HookStrategyEnum,
  PredicateAndOrOperatorEnum,
} from '@interfaces/GlobalHookType';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  Add,
  AlertTriangle,
  Check,
  ChevronDown,
  PaginateArrowLeft,
  PaginateArrowRight,
  Save,
  Schedule,
  UserSmileyFace,
} from '@oracle/icons';
import { ICON_SIZE } from '@components/shared/index.style';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  camelCaseToNormalWithSpaces,
  capitalizeRemoveUnderscoreLower,
  pluralize,
} from '@utils/string';
import { datetimeInLocalTimezone } from '@utils/date';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getUser } from '@utils/session';
import { indexBy, removeAtIndex, sortByKey } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { renderPredicate } from '../utils';
import { selectKeys, selectEntriesWithValues } from '@utils/hash';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useError } from '@context/Error';

type GlobalHookDetailProps = {
  isNew?: boolean;
  operationType?: string;
  resourceType?: string;
  rootProject?: boolean;
  uuid?: string;
};

function GlobalHookDetail({
  isNew,
  operationType: operationTypeProp,
  resourceType: resourceTypeProp,
  rootProject,
  uuid: globalHookUUID,
}: GlobalHookDetailProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const currentUser = getUser();
  const router = useRouter();
  const componentUUID = `GlobalHookDetail/${globalHookUUID}`;
  const themeContext: ThemeType = useContext(ThemeContext);

  const [attributes, setAttributesState] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<boolean>(false);

  const [operationType, setOperationType] = useState<string>(operationTypeProp)
  const [resourceType, setResourceType] = useState<string>(resourceTypeProp)

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const query = useMemo(() => selectEntriesWithValues({
    include_operation_types: 1,
    include_resource_types: 1,
    include_snapshot_validation: 1,
    operation_type: typeof operationType === 'undefined' ? null : operationType,
    resource_type: typeof resourceType === 'undefined' ? null : resourceType,
    ...(rootProject ? { root_project: rootProject } : {}),
  }), [
    operationType,
    resourceType,
  ]);
  const { data: dataGlobalHook } = api.global_hooks.detail(isNew ? '__new__' : globalHookUUID, query);

  const globalHook =  useMemo(() => dataGlobalHook?.global_hook, [
    dataGlobalHook,
  ]);

  const onSuccessProps = useMemo(() => ({
    onErrorCallback: ({
      error: {
        errors,
        exception,
        message,
        type,
      },
      response,
    }) => {
      toast.error(
        errors?.error || exception || message,
        {
          position: toast.POSITION.BOTTOM_RIGHT,
          toastId: type,
        },
      );

      return showError({
        errors,
        response,
      });
    },
  }), []);

  const [createGlobalHook, { isLoading: isLoadingCreateGlobalHook }] = useMutation(
    api.global_hooks.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            global_hook: objectServer,
          }) => {
            router.replace(
              `/${rootProject ? 'platform/' : ''}global-hooks/${objectServer.uuid}?operation_type=${objectServer.operation_type}&resource_type=${objectServer.resource_type}`,
            );
          },
          ...onSuccessProps,
        },
      ),
    },
  );

  const [updateGlobalHook, { isLoading: isLoadingUpdateGlobalHook }] = useMutation(
    api.global_hooks.useUpdate(globalHook?.uuid, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            global_hook: objectServer,
          }) => {
            setAttributes(prev => ({
              ...prev,
              ...objectServer,
            }));

            toast.success(
              'Global hook changes successfully saved.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `global-hooks-success-${objectServer.uuid}`,
              },
            );
          },
          ...onSuccessProps,
        },
      ),
    },
  );

  const [updateSnapshot, { isLoading: isLoadingUpdateSnapshot }] = useMutation(
    ({
      pipeline,
    }: {
      pipeline: {
        uuid: string;
      };
    }) => api.global_hooks.useUpdate(globalHook?.uuid, query)({
      global_hook: {
        pipeline,
        snapshot: 1,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            global_hook: objectServer,
          }) => {
            setAttributes(prev => ({
              ...prev,
              metadata: {
                ...prev?.metadata,
                ...objectServer?.metadata,
              },
              pipeline: {
                ...prev?.pipeline,
                ...objectServer?.pipeline,
              },
            }));

            toast.success(
              'Snapshot successfully created.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `global-hooks-snapshot-success-${objectServer.uuid}`,
              },
            );
          },
          ...onSuccessProps,
        },
      ),
    },
  );

  const [deleteGlobalHook, { isLoading: isLoadingDelete }] = useMutation(
    api.global_hooks.useDelete(globalHook?.uuid, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            global_hook: objectServer,
          }) => {
            toast.success(
              'Global hook changes successfully saved.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `global-hooks-success-${objectServer.uuid}`,
              },
            );
            router.replace(`/${rootProject ? 'platform/' : ''}global-hooks`);
          },
          ...onSuccessProps,
        },
      ),
    },
  );

  const { data: dataPipelines } = api.pipelines.list();
  const pipelines =
    useMemo(() => sortByKey(dataPipelines?.pipelines || [], ({ name }) => name), [
      dataPipelines,
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
    if (globalHook && !attributes) {
      setAttributesState(globalHook);
    }
  }, [
    attributes,
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
        secondary
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
                  onClick={() => {
                    updateOutputAtIndex({
                      ...output,
                      keyMore: '',
                      keys: (keys || []).concat(keyMore),
                    }, idx);
                  }}
                  small
                >
                  Add key {keyMore}
                </Button>

                <Spacing mr={PADDING_UNITS} />
              </>
            )}
          </SetupSectionRow>

          <SetupSectionRow
            title="Remove block output"
          >
            <Button
              compact
              onClick={() => setAttributes(prev => ({
                ...prev,
                outputs: removeAtIndex(prev?.outputs || [], idx),
              }))}
              small
            >
              Remove
            </Button>
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

  const payload = useMemo(() => selectKeys(attributes || {}, [
    'conditions',
    'operation_type',
    'outputs',
    'pipeline',
    'predicate',
    'resource_type',
    'run_settings',
    'stages',
    'strategies',
  ]), [attributes]);

  const metadata = useMemo(() => attributes?.metadata || {
    created_at: null,
    snapshot_hash: null,
    snapshot_valid: false,
    snapshotted_at: null,
    updated_at: null,
    user: {
      id: null,
    },
  }, [attributes]);

  const predicate = useMemo(() => attributes?.predicate, [attributes]);

  const predicatesMemo = useMemo(() => (
    <Spacing p={PADDING_UNITS}>
      {renderPredicate({
        level: -1,
        predicate,
        renderPredicate,
        setPredicate: predicate => setAttributes(prev => ({
          ...prev,
          predicate: {
            ...predicate,
            and_or_operator: PredicateAndOrOperatorEnum.OR,
          },
        })),
      })}
    </Spacing>
  ), [
    predicate,
    setAttributes,
  ]);

  return (
    <Spacing mb={8} p={PADDING_UNITS}>
      <SetupSection title="What to run hook for">
        <SetupSectionRow
          description="This hook’s UUID must be unique across all hooks for the same resource type and operation type."
          invalid={attributesTouched && !attributes?.uuid}
          textInput={isNew
            ? {
              monospace: true,
              onChange: e => setAttributes(prev => ({
                ...prev,
                uuid: e.target.value,
              })),
              placeholder: 'e.g. bootstrap pipeline blocks',
              value: attributes?.uuid,
            }
            : null
          }
          title="Hook UUID"
        >
          {!isNew && (
            <Spacing px={PADDING_UNITS}>
              <Text large monospace>
                {globalHookUUID}
              </Text>
            </Spacing>
          )}
        </SetupSectionRow>

        <SetupSectionRow
          description="Select the resource this hook should be attached to."
          invalid={attributesTouched && !attributes?.resource_type}
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
            placeholder: 'e.g. Pipeline',
            value: attributes?.resource_type,
          }}
          title="Resource type"
        />

        <SetupSectionRow
          description="When a specific operation occurs for a given resource, this hook will be invoked for that specific operation on the configured resource."
          invalid={attributesTouched && !attributes?.operation_type}
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
            placeholder: 'e.g. Update',
            value: attributes?.operation_type,
          }}
          title="Operation type"
        />

        {!isNew && (
          <Accordion
            noBorder
            noBoxShadow
            visibleMappingForced={{
              0: true,
            }}
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
              </Spacing>

              {predicatesMemo}
            </AccordionPanel>
          </Accordion>
        )}
      </SetupSection>

      {!isNew && (
        <>
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

          <SetupSection
            title="Code to run"
            description="When the current hook gets triggered, it will execute the associated pipeline."
          >
            <SetupSectionRow
              title="Pipeline to execute"
              description="Select a pipeline that will be executed every time this hook is triggered."
              invalid={attributesTouched && !attributes?.pipeline?.uuid}
              selectInput={{
                fullWidth: false,
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
                placeholder: 'Select a pipeline',
                value: attributes?.pipeline?.uuid,
              }}
            >
              {attributes?.pipeline?.uuid && (
                <Spacing mr={2}>
                  <NextLink
                    as={`/pipelines/${attributes?.pipeline?.uuid}/edit`}
                    href={'/pipelines/[pipeline]/edit'}
                    passHref
                  >
                    <Link
                      block
                      openNewWindow
                    >
                      View pipeline
                    </Link>
                  </NextLink>
                </Spacing>
              )}
            </SetupSectionRow>

            <SetupSectionRow
              title={attributes?.pipeline?.uuid && !metadata?.snapshot_hash && !metadata?.snapshot_valid
                ? 'Code snapshot hasn’t been created yet'
                : 'Valid code snapshot'
              }
              description={(
                <>
                  <Text muted small>
                    Take a snapshot of {!attributes?.pipeline?.uuid
                      ? 'the associated pipeline'
                      : <Text default inline monospace small>{attributes?.pipeline?.uuid}</Text>
                    }’s code. The snapshot is used to validate the hook before it runs.

                    <br />

                    A hook cannot run if {!attributes?.pipeline?.uuid
                      ? 'the associated pipeline'
                      : <Text default inline monospace small>{attributes?.pipeline?.uuid}</Text>
                    }’s code has changed after the most recent snapshot has been made.
                    <br />

                    If the code changes, a new snapshot must be created.
                  </Text>
                </>
              )}
              invalid={attributes?.pipeline?.uuid && metadata?.snapshot_hash && !metadata?.snapshot_valid}
              warning={attributes?.pipeline?.uuid && !metadata?.snapshot_hash && !metadata?.snapshot_valid}
            >
              {!metadata?.snapshot_hash && (
                <Text default large>
                  {!attributes?.pipeline?.uuid
                    ? 'Select a pipeline before taking a snapshot'
                    : 'No snapshot has been created'
                  }
                </Text>
              )}
              {metadata?.snapshot_hash && (
                <FlexContainer flexDirection="column">
                  <Text
                    danger={!metadata?.snapshot_valid}
                    large
                    rightAligned
                    success={metadata?.snapshot_valid}
                  >
                    {metadata?.snapshot_valid
                      ? 'Snapshot valid'
                      : 'Snapshot outdated'
                    }
                  </Text>
                </FlexContainer>
              )}
            </SetupSectionRow>

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center" justifyContent="flex-end">
                <FlexContainer alignItems="center">
                  {metadata?.snapshotted_at && (
                    <>
                      <Text muted rightAligned small>
                        Last snapshot at <Text
                          inline
                          muted
                          small
                          monospace
                        >
                          {metadata?.snapshotted_at}
                        </Text>
                      </Text>

                      <Spacing mr={PADDING_UNITS} />
                    </>
                  )}

                  <Button
                    disabled={!attributes?.pipeline?.uuid}
                    loading={isLoadingUpdateSnapshot}
                    onClick={() => updateSnapshot({
                      pipeline: attributes?.pipeline,
                    })}
                    primary={!metadata?.snapshot_valid}
                    secondary={metadata?.snapshot_valid}
                  >
                    {!metadata?.snapshot_hash
                      ? 'Create snapshot of code'
                      : metadata?.snapshot_valid
                        ? 'Update snapshot even though it’s valid'
                        : 'Update snapshot to make it valid'
                    }
                  </Button>
                </FlexContainer>
              </FlexContainer>
            </Spacing>
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
              title="Run hook asynchronously"
              description={(
                <Text muted small>
                  Hooks will execute the associated pipeline synchronously and
                  prevent the current resource operation (e.g. API request) from resolving
                  until all associated hooks for that resource operation are completed.

                  <br />

                  Hooks running synchronously can mutate the input data and output data.
                  However, it can slow down the user experience in the application.

                  <br />

                  Enable this setting to run hooks asynchronously and
                  not block the current resource operation from resolving.

                  <br />

                  However, asynchronous hooks cannot mutate the input data or output data.
                  Use this asynchronous setting when hooks don’t need to mutate data.
                </Text>
              )}
              toggleSwitch={{
                checked: !!attributes?.run_settings?.asynchronous,
                onCheck: (valFunc: (val: boolean) => boolean) => setAttributes(prev => ({
                  ...prev,
                  run_settings: {
                    ...prev?.run_settings,
                    asynchronous: valFunc(prev?.run_settings?.asynchronous),
                  },
                })),
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

          <Spacing mb={PADDING_UNITS} />

          <SetupSection title="Metadata">
            <SetupSectionRow
              title="Last updated"
            >
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text large monospace muted>
                  {metadata?.updated_at
                    ? datetimeInLocalTimezone(
                      metadata?.updated_at,
                      displayLocalTimezone,
                    )
                    : '-'
                  }
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Schedule muted size={ICON_SIZE} />

                <Spacing mr={1} />
              </Flex>
            </SetupSectionRow>

            <SetupSectionRow
              title="Created at"
            >
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text large monospace muted>
                  {metadata?.created_at
                    ? datetimeInLocalTimezone(
                      metadata?.created_at,
                      displayLocalTimezone,
                    )
                    : '-'
                  }
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Schedule muted size={ICON_SIZE} />

                <Spacing mr={1} />
              </Flex>
            </SetupSectionRow>

            <SetupSectionRow
              title="Snapshotted at"
            >
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text large monospace muted>
                  {metadata?.snapshotted_at
                    ? datetimeInLocalTimezone(
                      metadata?.snapshotted_at,
                      displayLocalTimezone,
                    )
                    : '-'
                  }
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Schedule muted size={ICON_SIZE} />

                <Spacing mr={1} />
              </Flex>
            </SetupSectionRow>

            <SetupSectionRow
              title="Snapshot valid"
            >
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text
                  large
                  danger={!metadata?.snapshot_valid}
                  muted={metadata?.snapshot_valid}
                >
                  {metadata?.snapshot_valid
                    ? 'Valid'
                    : 'Hook won’t run until snapshot is valid'
                  }
                </Text>

                <Spacing mr={PADDING_UNITS} />

                {metadata?.snapshot_valid
                  ? <Check size={ICON_SIZE} success />
                  : <AlertTriangle danger size={ICON_SIZE} />
                }

                <Spacing mr={1} />
              </Flex>
            </SetupSectionRow>

            <SetupSectionRow title="Created by">
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text large monospace muted>
                  {metadata?.user?.id
                    ? String(metadata?.user?.id) === String(currentUser?.id)
                      ? 'You created this hook'
                      : `User ID ${metadata?.user?.id }`
                    : '-'
                  }
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <UserSmileyFace muted size={ICON_SIZE} />

                <Spacing mr={1} />
              </Flex>
            </SetupSectionRow>
          </SetupSection>
        </>
      )}

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          {!isNew && (
            <>
              <Button
                compact
                danger
                loading={isLoadingDelete}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.confirm(
                    'Are you sure you wantt to delete this hook?',
                  )) {
                    deleteGlobalHook();
                  }
                }}
                small
              >
                Delete global hook
              </Button>

              <Spacing mr={PADDING_UNITS} />
            </>
          )}

          <Flex flex={1} justifyContent="flex-end">
            <Button
              beforeIcon={<PaginateArrowLeft />}
              disabled={isLoadingCreateGlobalHook || isLoadingUpdateGlobalHook || isLoadingDelete}
              onClick={() => router.push(`/${rootProject ? 'platform/' : ''}global-hooks`)}
              secondary
            >
              {attributesTouched
                ? 'Cancel changes & go back'
                : 'Go back to all hooks'
              }
            </Button>

            <Spacing mr={PADDING_UNITS} />

            <Button
              beforeIcon={<Save />}
              disabled={isLoadingDelete}
              loading={isLoadingCreateGlobalHook || isLoadingUpdateGlobalHook}
              // @ts-ignore
              onClick={() => (isNew ? createGlobalHook : updateGlobalHook)({
                global_hook: {
                  ...payload,
                  ...(isNew
                    ? {
                      uuid: attributes?.uuid,
                    }
                    : {}
                  ),
                  root_project: rootProject,
                },
              })}
              primary
            >
              {isNew ? 'Create new global hook' : 'Save changes'}
            </Button>
          </Flex>
        </FlexContainer>
      </Spacing>
    </Spacing>
  );
}

export default GlobalHookDetail;
