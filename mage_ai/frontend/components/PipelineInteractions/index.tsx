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
import { Add, Edit } from '@oracle/icons';
import { ButtonContainerStyle, ContainerStyle } from './index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { RoleFromServerEnum } from '@interfaces/UserType';
import { indexBy, removeAtIndex } from '@utils/array';
import { pauseEvent } from '@utils/events';

type PipelineInteractionsProps = {
  createInteraction: (interaction: InteractionType) => void;
  interactions: InteractionType[];
  isLoadingCreateInteraction?: boolean;
  isLoadingUpdatePipelineInteraction?: boolean;
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  refAfterFooter?: any;
  selectedBlock?: BlockType;
  setSelectedBlock?: (block: BlockType) => void;
  updatePipelineInteraction: (pipelineInteraction: PipelineInteractionType) => void;
};

function PipelineInteractions({
  createInteraction,
  interactions,
  isLoadingCreateInteraction,
  isLoadingUpdatePipelineInteraction,
  pipeline,
  pipelineInteraction,
  refAfterFooter,
  selectedBlock: editingBlock,
  setSelectedBlock,
  updatePipelineInteraction,
}: PipelineInteractionsProps) {
  const containerRef = useRef(null);
  const refNewInteractionUUID = useRef(null);
  const refMostRecentlyAddedInteraction = useRef(null);

  const [newInteractionUUID, setNewInteractionUUID] = useState<string>(null);
  const [isAddingNewInteraction, setIsAddingNewInteraction] = useState<boolean>(false);
  const [mostRecentlyAddedInteractionUUID, setMostRecentlyAddedInteractionUUID] = useState<string>(null);

  const [interactionsMapping, setInteractionsMapping] = useState<{
    [interactionUUID: string]: InteractionType;
  }>(null);
  const [blockInteractionsMapping, setBlockInteractionsMapping] = useState<{
    [blockUUID: string]: BlockInteractionType[];
  }>(null);
  const [permissionsState, setPermissionsState] =
    useState<InteractionPermission[] | InteractionPermissionWithUUID[]>(null);

  const [lastUpdated, setLastUpdated] = useState<Number>(null);

  const updateBlockInteractionAtIndex = useCallback((
    blockUUID: string,
    index: number,
    blockInteraction: BlockInteractionType,
    opts?: {
      remove?: boolean;
    },
  // @ts-ignore
  ) => setBlockInteractionsMapping((prev: {
    [blockUUID: string]: BlockInteractionType;
  }) => {
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
  }), [
    setBlockInteractionsMapping,
  ]);

  // @ts-ignore
  const setPermissions: (prev) => InteractionPermissionWithUUID[] =
    useCallback((prev) => {
      setLastUpdated(Number(new Date()));
      setPermissionsState(prev);
    }, [
      setLastUpdated,
      setPermissionsState,
    ]);

  // @ts-ignore
  const permissions: InteractionPermissionWithUUID[] = useMemo(() => permissionsState?.map(({
    roles,
    triggers,
  }: InteractionPermission, idx1: number) => ({
    roles: roles?.map((
      roleItem: RoleFromServerEnum | BlockInteractionRoleWithUUIDType,
      idx2: number,
    ) => ({
      role: typeof roleItem === 'string' ? roleItem : roleItem?.role,
      uuid: `${idx1}-${lastUpdated}-${idx2}`,
    })),
    triggers: triggers?.map((trigger: BlockInteractionTriggerType, idx2: number) => ({
      ...trigger,
      uuid: `${idx1}-${lastUpdated}-${idx2}`,
    })),
    uuid: `${idx1}-${lastUpdated}`,
  })), [
    lastUpdated,
    permissionsState,
  ]);

  const savePipelineInteraction = useCallback(() => updatePipelineInteraction({
    ...pipelineInteraction,
    blocks: blockInteractionsMapping,
    interactions: interactionsMapping,
    permissions: permissions?.map(
      ({
        roles,
        triggers,
      }: InteractionPermission | InteractionPermissionWithUUID) => ({
        roles: roles?.map(
          (roleItem: RoleFromServerEnum | BlockInteractionRoleWithUUIDType) => typeof roleItem === 'string'
            ? roleItem
            : roleItem?.role,
        ),
        triggers: triggers?.map(({
          schedule_interval: scheduleInterval,
          schedule_type: scheduleType,
        }: BlockInteractionTriggerType | BlockInteractionTriggerWithUUIDType) => ({
          schedule_interval: scheduleInterval,
          schedule_type: scheduleType,
        })),
      }),
    ),
  }), [
    blockInteractionsMapping,
    interactionsMapping,
    permissions,
    pipelineInteraction,
    updatePipelineInteraction,
  ]);

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  // @ts-ignore
  const visibleMapping: {
    [key: string]: boolean;
  } = useMemo(() => blocks?.reduce((acc, _, idx: number) => ({
    ...acc,
    [String(idx)]: true,
  }), {}), [
    blocks,
  ]);

  useEffect(() => {
    if (!interactionsMapping && interactions?.length >= 1) {
      setInteractionsMapping(indexBy(
        interactions || [],
        ({ uuid }) => uuid,
      ));
    }
  }, [
    interactions,
    interactionsMapping,
    setInteractionsMapping,
  ]);

  useEffect(() => {
    if (!blockInteractionsMapping && pipelineInteraction?.blocks) {
      setBlockInteractionsMapping(pipelineInteraction?.blocks);
    }
  }, [
    blockInteractionsMapping,
    pipelineInteraction,
    setBlockInteractionsMapping,
  ]);

  useEffect(() => {
    if (!permissions && pipelineInteraction?.permissions) {
      setPermissions(pipelineInteraction?.permissions);
    }
  }, [
    permissions,
    pipelineInteraction,
    setPermissions,
  ]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    const blocksCount = blocks?.length || 0;

    blocks?.map((block: BlockType, idx: number) => {
      const {
        uuid: blockUUID,
      } = block || {
        uuid: null,
      }

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];
      const hasBlockInteractions = blockInteractions?.length >= 1;

      const buttonEl = (
        <Button
          beforeIcon={hasBlockInteractions ? <Edit /> : <Add />}
          compact
          onClick={(e) => {
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
          key={blockUUID}
          noBorderRadius
          noPaddingContent
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={1.5 * UNIT}
          title={(
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Spacing mr={PADDING_UNITS} py={1}>
                <Text large monospace>
                  {blockUUID}
                </Text>
              </Spacing>

              {hasBlockInteractions && (
                <FlexContainer alignItems="center">
                  {buttonEl}
                </FlexContainer>
              )}
            </FlexContainer>
          )}
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
                    interaction={interactionsMapping?.[blockInteraction?.uuid]}
                    setInteractionsMapping={setInteractionsMapping}
                  />
                </Spacing>
              ))}
            </Spacing>
          </ContainerStyle>
        </AccordionPanel>
      );
    });

    return arr;
  }, [
    blocks,
    containerRef,
    interactionsMapping,
    setBlockInteractionsMapping,
    setInteractionsMapping,
    setSelectedBlock,
  ]);

  const accordionMemo = useMemo(() => blocks?.length >= 1 && (
    <Accordion
      noBorder
      visibleMapping={visibleMapping}
    >
      {interactionsMemo}
    </Accordion>
  ), [
    blocks,
    interactionsMemo,
    visibleMapping,
  ]);

  const editingBlockInteractions =
    useMemo(() => blockInteractionsMapping?.[editingBlock?.uuid] || [], [
      blockInteractionsMapping,
      editingBlock,
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
              <Headline>
                Blocks with interactions
              </Headline>
            </Spacing>

            {accordionMemo}

            <Spacing mb={PADDING_UNITS} mt={UNITS_BETWEEN_SECTIONS}>
              <FlexContainer alignItems="center">
                <Headline>
                  Permissions
                </Headline>

                <Spacing mr={PADDING_UNITS} />

                <FlexContainer alignItems="center">
                  <Button
                    beforeIcon={<Add />}
                    compact
                    onClick={() => setPermissions(prev => prev.concat([{
                      roles: [],
                      triggers: [],
                    }]))}
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
          <Spacing mb={UNITS_BETWEEN_SECTIONS}>
            <FlexContainer alignItems="center">
              <Spacing mr={PADDING_UNITS} py={1}>
                <Headline>
                  Interactions for block
                </Headline>
              </Spacing>

              <FlexContainer alignItems="center">
                {!isAddingNewInteraction && (
                  <>
                    <Button
                      beforeIcon={<Add />}
                      compact
                      onClick={(e) => {
                        pauseEvent(e);
                        setIsAddingNewInteraction(true);
                        setTimeout(() => refNewInteractionUUID?.current?.focus(), 1);
                      }}
                      primary
                      small
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
                      onChange={(e) => {
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
                      compact
                      loading={isLoadingCreateInteraction}
                      onClick={(e) => {
                        pauseEvent(e);

                        createInteraction({
                          block_uuid: editingBlock?.uuid,
                          inputs: {},
                          layout: [],
                          uuid: `${newInteractionUUID}.${BlockLanguageEnum.YAML}`,
                          variables: {},
                        // @ts-ignore
                        }).then(({
                          data: {
                            interaction,
                          },
                        }) => {
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

                          setTimeout(
                            () => {
                              refMostRecentlyAddedInteraction?.current?.scrollIntoView()
                            },
                            ANIMATION_DURATION_CONTENT + 100,
                          );
                        });

                        setIsAddingNewInteraction(false);
                        setMostRecentlyAddedInteractionUUID(newInteractionUUID);
                        setNewInteractionUUID(null);
                      }}
                      primary
                      small
                    >
                      Save interaction
                    </Button>

                    <Spacing mr={1} />

                    <Button
                      compact
                      onClick={(e) => {
                        pauseEvent(e);

                        setIsAddingNewInteraction(false);
                        setNewInteractionUUID(null);
                      }}
                      secondary
                      small
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </FlexContainer>
            </FlexContainer>

            <Spacing mt={1}>
              <Text default>
                A block can have multiple sets of interactions associated with it.
              </Text>
            </Spacing>
          </Spacing>
        )}

        {editingBlockInteractions?.map((
          blockInteraction: BlockInteractionType, idx: number,
        ) => {
          const {
            description: blockInteractionDescription,
            name: blockInteractionName,
          } = blockInteraction || {
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
                interaction={interaction}
                isEditing
                removeBlockInteraction={() => updateBlockInteractionAtIndex(
                  blockUUID,
                  idx,
                  blockInteraction,
                  {
                    remove: true,
                  },
                )}
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
                        onChange={e => updateBlockInteractionAtIndex(blockUUID, idx, {
                          name: e.target.value,
                        })}
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
                        onChange={e => updateBlockInteractionAtIndex(blockUUID, idx, {
                          description: e.target.value,
                        })}
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
                ref={idx === editingBlockInteractions?.length - 1
                  ? refMostRecentlyAddedInteraction
                  : null
                }
              />
            </div>
          );
        })}
      </Spacing>

      <ButtonContainerStyle ref={refAfterFooter}>
        <Spacing p={PADDING_UNITS}>
          <Button
            loading={isLoadingUpdatePipelineInteraction}
            onClick={() => savePipelineInteraction()}
            primary
          >
            Save interactions for all blocks
          </Button>
        </Spacing>
      </ButtonContainerStyle>
    </Spacing>
  );
}

export default PipelineInteractions;
