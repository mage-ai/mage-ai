import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel, {
  ANIMATION_DURATION_CONTENT,
} from '@oracle/components/Accordion/AccordionPanel';
import BlockInteractionController from '@components/Interactions/BlockInteractionController';
import BlockType from '@interfaces/BlockType';
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
import { ContainerStyle } from './index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { RoleFromServerEnum } from '@interfaces/UserType';
import { indexBy } from '@utils/array';
import { pauseEvent } from '@utils/events';

type PipelineInteractionsProps = {
  interactions: InteractionType[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  selectedBlockUUID?: string;
  setSelectedBlockUUID?: (blockUUID: string) => void;
};

function PipelineInteractions({
  interactions,
  pipeline,
  pipelineInteraction,
  selectedBlockUUID,
  setSelectedBlockUUID,
}: PipelineInteractionsProps) {
  const containerRef = useRef(null);

  const [interactionsMapping, setInteractionsMapping] = useState<{
    [interactionUUID: string]: InteractionType;
  }>(null);
  const [blockInteractionsMapping, setBlockInteractionsMapping] = useState<{
    [blockUUID: string]: BlockInteractionType;
  }>(null);
  const [permissionsState, setPermissionsState] =
    useState<InteractionPermission[] | InteractionPermissionWithUUID[]>(null);
  const [editingBlock, setEditingBlock]: BlockType = useState<BlockType>(null);

  const [lastUpdated, setLastUpdated] = useState<Number>(null);

  const updateBlockInteractionAtIndex = useCallback((
    blockUUID: string,
    index: number,
    blockInteraction: BlockInteractionType,
  ) => setBlockInteractionsMapping((prev: {
    [blockUUID: string]: BlockInteractionType;
  }) => {
    const blockInteractions = [...(prev?.[blockUUID] || [])];
    blockInteractions[index] = {
      ...blockInteractions[index],
      ...blockInteraction,
    };

    return {
      ...prev,
      [blockUUID]: blockInteractions,
    };
  }), [
    setBlockInteractionsMapping,
  ]);

  const setPermissions: (prev) => InteractionPermissionWithUUID[] =
    useCallback((prev) => {
      setLastUpdated(Number(new Date()));
      setPermissionsState(prev);
    }, [
      setLastUpdated,
      setPermissionsState,
    ]);

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

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const visibleMapping = useMemo(() => blocks?.reduce((acc, _, idx: number) => ({
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
    if (!blockInteractionsMapping && pipelineInteraction?.interactions) {
      setBlockInteractionsMapping(pipelineInteraction?.interactions);
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

    blocks?.map((block: BlockType, idx: number) => {
      const {
        uuid: blockUUID,
      } = block || {
        uuid: null,
      }

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];

      arr.push(
        <AccordionPanel
          key={blockUUID}
          noBorderRadius
          noPaddingContent
          onClick={() => {
            // setVisibleMappingForced({});
          }}
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={1.5 * UNIT}
          title={(
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Spacing mr={PADDING_UNITS} py={1}>
                <Text default large monospace>
                  {blockUUID}
                </Text>
              </Spacing>

              <FlexContainer
                alignItems="center"
              >
                <Button
                  beforeIcon={<Edit />}
                  compact
                  onClick={(e) => {
                    pauseEvent(e);
                    setEditingBlock(block);
                  }}
                  secondary
                  small
                >
                  Edit interactions for block
                </Button>
              </FlexContainer>
            </FlexContainer>
          )}
        >
          <ContainerStyle
            noBackground
            noBorderRadiusBottom
            noBorderRadiusTop
          >
            <Spacing p={PADDING_UNITS}>
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
    setEditingBlock,
    setInteractionsMapping,
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
    <Spacing p={PADDING_UNITS}>
      <div ref={containerRef}>
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

            {permissions?.map((permission: InteractionPermission, idx: number) => (
              <Spacing key={`permission-${idx}`} mt={idx >= 1 ? PADDING_UNITS : 0}>
                <PermissionRow
                  index={idx}
                  permission={permission}
                  setPermissions={setPermissions}
                  updatePermission={(permissionUpdated: InteractionPermission) => {
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
          <div>
            <Spacing mb={UNITS_BETWEEN_SECTIONS}>
              <FlexContainer alignItems="center">
                <Headline>
                  Interactions for block
                </Headline>

                <Spacing mr={PADDING_UNITS} />

                <FlexContainer alignItems="center">
                  <Button
                    beforeIcon={<Add />}
                    compact
                    // onClick={() => setPermissions(prev => prev.concat([{
                    //   roles: [],
                    //   triggers: [],
                    // }]))}
                    primary
                    small
                  >
                    Create and add new interaction
                  </Button>

                  <Spacing mr={PADDING_UNITS} />

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

              return (
                <div key={`${blockInteraction?.uuid}-${idx}`}>
                  {idx >= 1 && (
                    <Spacing my={UNITS_BETWEEN_SECTIONS}>
                      <Divider light />
                    </Spacing>
                  )}

                  <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
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

                  <BlockInteractionController
                    blockInteraction={blockInteraction}
                    containerRef={containerRef}
                    interaction={interactionsMapping?.[blockInteraction?.uuid]}
                    isEditing
                    setInteractionsMapping={setInteractionsMapping}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Spacing>
  );
}

export default PipelineInteractions;
