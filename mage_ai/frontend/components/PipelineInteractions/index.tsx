import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel, {
  ANIMATION_DURATION_CONTENT,
} from '@oracle/components/Accordion/AccordionPanel';
import BlockInteractionController from '@components/Interactions/BlockInteractionController';
import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InteractionType from '@interfaces/InteractionType';
import PipelineInteractionType, {
  BlockInteractionRoleWithUUIDType,
  BlockInteractionTriggerType,
  BlockInteractionTriggerWithUUIDType,
  BlockInteractionType,
  InteractionPermission,
  InteractionPermissionWithUUID,
} from '@interfaces/PipelineInteractionType';
import PermissionRow from './PermissionRow';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { Add, AlertTriangle, Edit, Save } from '@oracle/icons';
import { ButtonContainerStyle, ContainerStyle } from './index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { RoleFromServerEnum } from '@interfaces/UserType';
import { dateFormatLongFromUnixTimestamp } from '@utils/date';
import { indexBy, removeAtIndex } from '@utils/array';
import { pauseEvent } from '@utils/events';

type PipelineInteractionsProps = {
  blockInteractionsMapping: {
    [blockUUID: string]: BlockInteractionType[];
  };
  containerWidth?: number;
  createInteraction: (interaction: InteractionType) => void;
  interactionsMapping: {
    [interactionUUID: string]: InteractionType;
  };
  interactions: InteractionType[];
  isLoadingCreateInteraction?: boolean;
  isLoadingUpdatePipelineInteraction?: boolean;
  permissions?: InteractionPermission[] | InteractionPermissionWithUUID[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  refAfterFooter?: any;
  setBlockInteractionsMapping: (prev: any) => {
    [blockUUID: string]: BlockInteractionType[];
  };
  setInteractionsMapping: (prev: any) => {
    [interactionUUID: string]: InteractionType;
  };
  savePipelineInteraction?: () => void;
  selectedBlock?: BlockType;
  setPermissions?: (prev: any) => void;
  setSelectedBlock?: (block: BlockType) => void;
  updatePipelineInteraction?: (pipelineInteraction: PipelineInteractionType) => void;
};

function PipelineInteractions({
  blockInteractionsMapping: blockInteractionsMappingProp,
  containerWidth,
  createInteraction,
  interactions,
  interactionsMapping: interactionsMappingProp,
  isLoadingCreateInteraction,
  isLoadingUpdatePipelineInteraction,
  permissions: permissionsProp,
  pipeline,
  pipelineInteraction,
  refAfterFooter,
  savePipelineInteraction: savePipelineInteractionProp,
  selectedBlock: editingBlock,
  setBlockInteractionsMapping: setBlockInteractionsMappingProp,
  setInteractionsMapping: setInteractionsMappingProp,
  setPermissions: setPermissionsProp,
  setSelectedBlock,
  updatePipelineInteraction,
}: PipelineInteractionsProps) {
  const containerRef = useRef(null);
  const refNewInteractionUUID = useRef(null);
  const refMostRecentlyAddedInteraction = useRef(null);

  const [lastSaved, setLastSaved] = useState<number>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(null);
  const [touched, setTouched] = useState<boolean>(false);

  const [newInteractionUUID, setNewInteractionUUID] = useState<string>(null);
  const [isAddingNewInteraction, setIsAddingNewInteraction] = useState<boolean>(false);
  const [mostRecentlyAddedInteractionUUID, setMostRecentlyAddedInteractionUUID] =
    useState<string>(null);
  const isLoadingInteractions = !blockInteractionsMappingProp;

  const [interactionsMappingState, setInteractionsMappingState] = useState<{
    [interactionUUID: string]: InteractionType;
  }>(null);
  const [blockInteractionsMappingState, setBlockInteractionsMappingState] = useState<{
    [blockUUID: string]: BlockInteractionType[];
  }>(null);

  const blockInteractionsMapping = useMemo(() => {
    if (typeof blockInteractionsMappingProp !== 'undefined') {
      return blockInteractionsMappingProp;
    }

    return blockInteractionsMappingState;
  }, [blockInteractionsMappingProp, blockInteractionsMappingState]);

  const interactionsMapping = useMemo(() => {
    if (typeof interactionsMappingProp !== 'undefined') {
      return interactionsMappingProp;
    }

    return interactionsMappingState;
  }, [interactionsMappingProp, interactionsMappingState]);

  const setBlockInteractionsMapping = useCallback(
    (
      prev,
      opts?: {
        initialBootstrap?: boolean;
      },
    ) => {
      if (!opts?.initialBootstrap) {
        setTouched(true);
      }

      if (typeof setBlockInteractionsMappingProp !== 'undefined') {
        return setBlockInteractionsMappingProp(prev);
      }

      return setBlockInteractionsMappingState(prev);
    },
    [setBlockInteractionsMappingProp, setBlockInteractionsMappingState, setTouched],
  );

  const setInteractionsMapping = useCallback(
    (
      prev,
      opts?: {
        initialBootstrap?: boolean;
      },
    ) => {
      if (!opts?.initialBootstrap) {
        setTouched(true);
      }

      if (typeof setInteractionsMappingProp !== 'undefined') {
        return setInteractionsMappingProp(prev);
      }

      return setInteractionsMappingState(prev);
    },
    [setInteractionsMappingProp, setInteractionsMappingState, setTouched],
  );

  const [permissionsState, setPermissionsState] = useState<
    InteractionPermission[] | InteractionPermissionWithUUID[]
  >(null);

  const updateBlockInteractionAtIndex = useCallback(
    (
      blockUUID: string,
      index: number,
      blockInteraction: BlockInteractionType,
      opts?: {
        remove?: boolean;
      },
      // @ts-ignore
    ) =>
      setBlockInteractionsMapping((prev: { [blockUUID: string]: BlockInteractionType }) => {
        // @ts-ignore
        let blockInteractions = [...(prev?.[blockUUID] || [])];

        if (opts?.remove) {
          blockInteractions = removeAtIndex(blockInteractions, index);
        } else {
          blockInteractions[index] = {
            ...blockInteractions[index],
            ...blockInteraction,
          };
        }

        return {
          ...prev,
          [blockUUID]: blockInteractions,
        };
      }),
    [setBlockInteractionsMapping],
  );

  // @ts-ignore
  const setPermissions: (prev) => InteractionPermissionWithUUID[] = useCallback(
    (
      prev,
      opts?: {
        initialBootstrap?: boolean;
      },
    ) => {
      setLastUpdated(Number(new Date()));

      if (!opts?.initialBootstrap) {
        setTouched(true);
      }

      if (typeof setPermissionsProp !== 'undefined') {
        setPermissionsProp(prev);
      } else {
        setPermissionsState(prev);
      }
    },
    [setLastUpdated, setPermissionsProp, setPermissionsState, setTouched],
  );

  // @ts-ignore
  const permissions: InteractionPermissionWithUUID[] = useMemo(
    () =>
      (typeof permissionsProp !== 'undefined' ? permissionsProp : permissionsState)
        // @ts-ignore
        ?.map(({ roles, triggers }: InteractionPermission, idx1: number) => ({
          roles: roles?.map(
            (roleItem: RoleFromServerEnum | BlockInteractionRoleWithUUIDType, idx2: number) => ({
              role: typeof roleItem === 'string' ? roleItem : roleItem?.role,
              uuid: `${idx1}-${lastUpdated}-${idx2}`,
            }),
          ),
          triggers: triggers?.map((trigger: BlockInteractionTriggerType, idx2: number) => ({
            ...trigger,
            uuid: `${idx1}-${lastUpdated}-${idx2}`,
          })),
          uuid: `${idx1}-${lastUpdated}`,
        })),
    [lastUpdated, permissionsProp, permissionsState],
  );

  const saveCallback = useCallback(() => {
    setLastSaved(Number(new Date()));
    setTouched(false);
  }, [setLastSaved, setTouched]);

  const savePipelineInteraction = useCallback(() => {
    if (savePipelineInteractionProp) {
      // @ts-ignore
      savePipelineInteractionProp?.().then(() => saveCallback());
    } else {
      updatePipelineInteraction?.({
        ...pipelineInteraction,
        blocks: blockInteractionsMapping,
        interactions: interactionsMapping,
        permissions: permissions?.map(
          ({ roles, triggers }: InteractionPermission | InteractionPermissionWithUUID) => ({
            roles: roles?.map((roleItem: RoleFromServerEnum | BlockInteractionRoleWithUUIDType) =>
              typeof roleItem === 'string' ? roleItem : roleItem?.role,
            ),
            triggers: triggers?.map(
              ({
                schedule_interval: scheduleInterval,
                schedule_type: scheduleType,
              }: BlockInteractionTriggerType | BlockInteractionTriggerWithUUIDType) => ({
                schedule_interval: scheduleInterval,
                schedule_type: scheduleType,
              }),
            ),
          }),
        ),
        // @ts-ignore
      }).then(() => saveCallback());
    }
  }, [
    blockInteractionsMapping,
    interactionsMapping,
    permissions,
    pipelineInteraction,
    saveCallback,
    savePipelineInteractionProp,
    updatePipelineInteraction,
  ]);

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  // @ts-ignore
  const visibleMapping: {
    [key: string]: boolean;
  } = useMemo(
    () =>
      blocks?.reduce(
        (acc, _, idx: number) => ({
          ...acc,
          [String(idx)]: true,
        }),
        {},
      ),
    [blocks],
  );

  useEffect(() => {
    if (
      typeof interactionsMappingProp === 'undefined' &&
      !interactionsMapping &&
      interactions?.length >= 1
    ) {
      setInteractionsMapping(
        indexBy(interactions || [], ({ uuid }) => uuid),
        { initialBootstrap: true },
      );
    }
  }, [interactions, interactionsMapping, interactionsMappingProp, setInteractionsMapping]);

  useEffect(() => {
    if (
      typeof blockInteractionsMappingProp === 'undefined' &&
      !blockInteractionsMapping &&
      pipelineInteraction?.blocks
    ) {
      setBlockInteractionsMapping(pipelineInteraction?.blocks, { initialBootstrap: true });
    }
  }, [
    blockInteractionsMapping,
    blockInteractionsMappingProp,
    pipelineInteraction,
    setBlockInteractionsMapping,
  ]);

  useEffect(() => {
    if (!permissions && pipelineInteraction?.permissions) {
      // @ts-ignore
      setPermissions(pipelineInteraction?.permissions, { initialBootstrap: true });
    }
  }, [permissions, pipelineInteraction, setPermissions]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    const blocksCount = blocks?.length || 0;

    blocks?.map((block: BlockType, idx: number) => {
      const { uuid: blockUUID } = block || {
        uuid: null,
      };

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];
      const hasBlockInteractions = blockInteractions?.length >= 1;

      const buttonEl = (
        <Button
          beforeIcon={hasBlockInteractions ? <Edit /> : <Add />}
          compact
          disabled={isLoadingInteractions}
          onClick={e => {
            pauseEvent(e);
            setSelectedBlock(block);
          }}
          primary={!hasBlockInteractions}
          secondary={hasBlockInteractions}
          small
        >
          {hasBlockInteractions && 'Edit interactions'}
          {!hasBlockInteractions && 'Add interactions'}
        </Button>
      );

      arr.push(
        <AccordionPanel
          first={idx == 0}
          key={blockUUID}
          noBorderRadius={idx >= 1}
          noPaddingContent
          title={
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Spacing mr={PADDING_UNITS} py={1}>
                <Text large monospace>
                  {blockUUID}
                </Text>
              </Spacing>

              {hasBlockInteractions && (
                <FlexContainer alignItems="center">{buttonEl}</FlexContainer>
              )}
            </FlexContainer>
          }
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={1.5 * UNIT}
        >
          <ContainerStyle
            noBackground
            noBorderRadiusBottom={idx < blocksCount - 1}
            noBorderRadiusTop
          >
            <Spacing p={PADDING_UNITS}>
              {!hasBlockInteractions && buttonEl}
              {blockInteractions?.map((blockInteraction: BlockInteractionType, idx: number) => (
                <Spacing
                  key={`${blockInteraction?.uuid}-${idx}`}
                  mt={idx >= 1 ? UNITS_BETWEEN_SECTIONS : 0}
                >
                  <BlockInteractionController
                    blockInteraction={blockInteraction}
                    containerRef={containerRef}
                    containerWidth={containerWidth}
                    interaction={interactionsMapping?.[blockInteraction?.uuid]}
                    setInteractionsMapping={setInteractionsMapping}
                    showVariableUUID
                  />
                </Spacing>
              ))}
            </Spacing>
          </ContainerStyle>
        </AccordionPanel>,
      );
    });

    return arr;
  }, [
    blockInteractionsMapping,
    blocks,
    containerRef,
    containerWidth,
    interactionsMapping,
    isLoadingInteractions,
    setInteractionsMapping,
    setSelectedBlock,
  ]);

  const accordionMemo = useMemo(
    () =>
      blocks?.length >= 1 && (
        <Accordion noBackground noBorder noBoxShadow visibleMapping={visibleMapping}>
          {interactionsMemo}
        </Accordion>
      ),
    [blocks, interactionsMemo, visibleMapping],
  );

  const editingBlockInteractions = useMemo(
    () => blockInteractionsMapping?.[editingBlock?.uuid] || [],
    [blockInteractionsMapping, editingBlock],
  );

  const editingBlockVariableUUIDs = useMemo(() => {
    const variableUUIDS = [];
    const variablesSeen = {};

    editingBlockInteractions?.forEach(({ uuid: interactionUUID }) => {
      const interaction = interactionsMapping?.[interactionUUID];
      const variables = interaction?.variables;

      Object.keys(variables || {}).forEach((variableUUID: string) => {
        if (!variablesSeen?.[variableUUID]) {
          variableUUIDS.push(variableUUID);
          variablesSeen[variableUUID] = true;
        }
      });
    });

    return variableUUIDS;
  }, [interactionsMapping, editingBlockInteractions]);

  const addBlockInteractionButtonMemo = useMemo(() => {
    const hasItems = editingBlockInteractions?.length >= 1;

    return (
      <FlexContainer alignItems="center">
        {!isAddingNewInteraction && (
          <>
            <Button
              beforeIcon={<Add />}
              compact={hasItems}
              onClick={e => {
                pauseEvent(e);
                setIsAddingNewInteraction(true);
                setTimeout(() => refNewInteractionUUID?.current?.focus(), 1);
              }}
              primary
              small={hasItems}
            >
              Create new set of interactions
            </Button>

            {/*<Spacing mr={1} />

            <Button
              beforeIcon={<Add />}
              compact
              // onClick={() => setPermissions(prev => prev.concat([{
              //   roles: [],
              //   triggers: [],
              // }]))}
              secondary
              small
            >
              Add from existing interactions
            </Button>*/}
          </>
        )}

        {isAddingNewInteraction && (
          <>
            <TextInput
              compact
              monospace
              onChange={e => {
                pauseEvent(e);
                setNewInteractionUUID(e.target.value);
              }}
              onClick={e => pauseEvent(e)}
              ref={refNewInteractionUUID}
              small
              value={newInteractionUUID || ''}
            />

            <Spacing mr={1} />

            <Button
              compact={hasItems}
              loading={isLoadingCreateInteraction}
              onClick={e => {
                pauseEvent(e);

                createInteraction({
                  block_uuid: editingBlock?.uuid,
                  inputs: {},
                  layout: [],
                  uuid: `${newInteractionUUID}.${BlockLanguageEnum.YAML}`,
                  variables: {},
                  // @ts-ignore
                }).then(({ data }) => {
                  if (data?.error) {
                    return;
                  }
                  const interaction = data?.interaction;
                  const interactionUUID = interaction?.uuid;

                  updateBlockInteractionAtIndex(
                    editingBlock?.uuid,
                    editingBlockInteractions?.length || 0,
                    {
                      uuid: interactionUUID,
                    },
                  );
                  setInteractionsMapping(prev => ({
                    ...prev,
                    [interactionUUID]: interaction,
                  }));

                  setTimeout(() => {
                    refMostRecentlyAddedInteraction?.current?.scrollIntoView();
                  }, ANIMATION_DURATION_CONTENT + 100);
                });

                setIsAddingNewInteraction(false);
                setMostRecentlyAddedInteractionUUID(newInteractionUUID);
                setNewInteractionUUID(null);
              }}
              primary
              small={hasItems}
            >
              Save interaction
            </Button>

            <Spacing mr={1} />

            <Button
              compact={hasItems}
              onClick={e => {
                pauseEvent(e);

                setIsAddingNewInteraction(false);
                setNewInteractionUUID(null);
              }}
              secondary
              small={hasItems}
            >
              Cancel
            </Button>
          </>
        )}
      </FlexContainer>
    );
  }, [
    createInteraction,
    editingBlock,
    editingBlockInteractions,
    isAddingNewInteraction,
    isLoadingCreateInteraction,
    newInteractionUUID,
    setInteractionsMapping,
    setIsAddingNewInteraction,
    setMostRecentlyAddedInteractionUUID,
    setNewInteractionUUID,
    updateBlockInteractionAtIndex,
  ]);

  return (
    <Spacing
      p={PADDING_UNITS}
      style={{
        position: 'relative',
      }}
    >
      <Spacing pb={PADDING_UNITS} ref={containerRef}>
        {!editingBlock && (
          <>
            <Spacing mb={PADDING_UNITS}>
              <Headline>Blocks with interactions</Headline>
            </Spacing>

            {accordionMemo}

            <Spacing mb={PADDING_UNITS} mt={UNITS_BETWEEN_SECTIONS}>
              <FlexContainer alignItems="center">
                <Headline>Permissions</Headline>

                <Spacing mr={PADDING_UNITS} />

                <FlexContainer alignItems="center">
                  <Button
                    beforeIcon={<Add />}
                    compact
                    disabled={isLoadingInteractions}
                    onClick={() =>
                      setPermissions(prev =>
                        prev?.concat([
                          {
                            roles: [],
                            triggers: [],
                          },
                        ]),
                      )
                    }
                    secondary
                    small
                  >
                    Add permission
                  </Button>
                </FlexContainer>
              </FlexContainer>

              <Spacing mt={1}>
                <Text default>
                  Add permissions to allow specific user roles the ability to trigger this pipeline
                  using the interactions for this pipeline.
                </Text>
              </Spacing>
            </Spacing>

            {permissions?.map((permission: InteractionPermissionWithUUID, idx: number) => (
              <Spacing key={`permission-${idx}`} mt={idx >= 1 ? PADDING_UNITS : 0}>
                <PermissionRow
                  index={idx}
                  permission={permission}
                  setPermissions={setPermissions}
                  updatePermission={(permissionUpdated: InteractionPermissionWithUUID) => {
                    const permissionsUpdated = [...permissions];
                    permissionsUpdated[idx] = permissionUpdated;

                    setPermissions(permissionsUpdated);
                  }}
                />
              </Spacing>
            ))}
          </>
        )}

        {editingBlock && (
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <FlexContainer alignItems="center">
                <Spacing mr={PADDING_UNITS} py={1}>
                  <Headline>Block interactions</Headline>
                </Spacing>

                {editingBlockInteractions?.length >= 1 && addBlockInteractionButtonMemo}
              </FlexContainer>

              <Text default>
                A block can have multiple sets of interactions associated with it.
              </Text>
            </Spacing>

            {!editingBlockInteractions?.length && addBlockInteractionButtonMemo}

            {editingBlockVariableUUIDs?.length >= 1 && (
              <FlexContainer alignItems="center">
                <Text bold large>
                  Variables
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Flex alignItems="center" flex={1}>
                  {editingBlockVariableUUIDs?.map((variableUUID: string, idx: number) => (
                    <Spacing key={variableUUID} mr={1}>
                      <Text default monospace>
                        {variableUUID}
                        {editingBlockVariableUUIDs?.length >= 2 &&
                          idx < editingBlockVariableUUIDs?.length - 1 && (
                            <Text inline monospace muted>
                              ,
                            </Text>
                          )}
                      </Text>
                    </Spacing>
                  ))}
                </Flex>
              </FlexContainer>
            )}
          </Spacing>
        )}

        {editingBlockInteractions?.map((blockInteraction: BlockInteractionType, idx: number) => {
          const { description: blockInteractionDescription, name: blockInteractionName } =
            blockInteraction || {
              description: null,
              name: null,
            };
          const blockUUID = editingBlock?.uuid;
          const interactionUUID = blockInteraction?.uuid;
          const interaction = interactionsMapping?.[interactionUUID];

          return (
            <div key={`${blockInteraction?.uuid}-${idx}`}>
              {idx >= 1 && (
                <Spacing my={UNITS_BETWEEN_SECTIONS}>
                  <Divider light />
                </Spacing>
              )}

              <BlockInteractionController
                blockInteraction={blockInteraction}
                containerRef={containerRef}
                containerWidth={containerWidth}
                interaction={interaction}
                isEditing
                removeBlockInteraction={() =>
                  updateBlockInteractionAtIndex(blockUUID, idx, blockInteraction, {
                    remove: true,
                  })
                }
                setInteractionsMapping={setInteractionsMapping}
              >
                <Spacing p={PADDING_UNITS}>
                  <FlexContainer alignItems="flex-start">
                    <Spacing mb={1} style={{ width: 20 * UNIT }}>
                      <Text bold large>
                        Label
                      </Text>
                      <Text muted>
                        Add a label for this
                        <br />
                        set of interactions.
                      </Text>
                    </Spacing>

                    <Spacing mr={PADDING_UNITS} />

                    <Flex flex={1}>
                      <TextInput
                        fullWidth
                        onChange={e =>
                          updateBlockInteractionAtIndex(blockUUID, idx, {
                            name: e.target.value,
                          })
                        }
                        value={blockInteractionName || ''}
                      />
                    </Flex>
                  </FlexContainer>

                  <Spacing mb={PADDING_UNITS} />

                  <FlexContainer alignItems="flex-start">
                    <Spacing mb={1} style={{ width: 20 * UNIT }}>
                      <Text bold large>
                        Description
                      </Text>
                      <Text muted>
                        Describe how these
                        <br />
                        interactions are used.
                      </Text>
                    </Spacing>

                    <Spacing mr={PADDING_UNITS} />

                    <Flex flex={1}>
                      <TextArea
                        fullWidth
                        onChange={e =>
                          updateBlockInteractionAtIndex(blockUUID, idx, {
                            description: e.target.value,
                          })
                        }
                        rows={Math.max(
                          3,
                          Math.min(12, blockInteractionDescription?.split('\n')?.length),
                        )}
                        value={blockInteractionDescription || ''}
                      />
                    </Flex>
                  </FlexContainer>
                </Spacing>
              </BlockInteractionController>

              <div
                ref={
                  idx === editingBlockInteractions?.length - 1
                    ? refMostRecentlyAddedInteraction
                    : null
                }
              />
            </div>
          );
        })}
      </Spacing>

      <ButtonContainerStyle
        ref={refAfterFooter}
        width={containerRef?.current?.getBoundingClientRect()?.width || null}
      >
        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Button
              beforeIcon={<Save />}
              disabled={isLoadingInteractions}
              loading={isLoadingUpdatePipelineInteraction}
              onClick={() => savePipelineInteraction()}
              primary={touched}
              secondary={!touched}
            >
              Save changes for all interactions
            </Button>

            <Spacing mr={PADDING_UNITS} />

            {touched && (
              <>
                <AlertTriangle warning />

                <Spacing mr={1} />

                <Text warning>You have unsaved interaction changes</Text>
              </>
            )}

            {!touched && lastSaved && (
              <Text muted>
                Interactions last saved at{' '}
                {dateFormatLongFromUnixTimestamp(Number(lastSaved) / 1000)}
              </Text>
            )}
          </FlexContainer>
        </Spacing>
      </ButtonContainerStyle>
    </Spacing>
  );
}

export default PipelineInteractions;
