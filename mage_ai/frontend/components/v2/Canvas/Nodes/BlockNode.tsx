import Aside from './Blocks/Aside';
import Markdown from '@mana/components/Markdown';
import { generateUUID } from '@utils/uuids/generator';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import Tag from '@mana/components/Tag';
import {
  TooltipDirection,
  TooltipJustify,
  TooltipAlign,
  HideTooltipReason,
  TooltipLayout,
  useTooltip,
} from '@context/v2/Tooltip/Context';
import useDispatchMounted from './useDispatchMounted';
import { AnimatePresence, cubicBezier } from 'framer-motion';
import Badge from '@mana/elements/Badge';
import BlockGroupOverview from './Blocks/BlockGroupOverview';
import BlockType from '@interfaces/BlockType';
import Circle from '@mana/elements/Circle';
import Connection from './Blocks/Connection';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import Loading from '@mana/components/Loading';
import PanelRows from '@mana/elements/PanelRows';
import TeleportBlock from './Blocks/TeleportBlock';
import TemplateConfigurations from './Blocks/TemplateConfigurations';
import Text from '@mana/elements/Text';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesGradient from '@styles/scss/elements/GradientContainer.module.scss';
import {
  Add,
  Code,
  Grab,
  PipeIconVertical,
  PlayButtonFilled,
  DeleteCircle,
  Infinite,
} from '@mana/icons';
import { AppTypeEnum, AppSubtypeEnum } from '../../Apps/constants';
import { AsideType, DragAndDropHandlersType, SharedBlockProps } from './types';
import { BlockNode } from './interfaces';
import { EventOperationEnum } from '@mana/shared/interfaces';
import {
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { ItemStatusEnum, ItemTypeEnum, LayoutConfigDirectionEnum, PortSubtypeEnum } from '../types';
import { AppNodeType, NodeItemType, PortType } from '../interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { StatusTypeEnum, BlockTypeEnum, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { TooltipWrapper } from '@context/v2/Tooltip';
import { borderConfigs, blockColorNames } from './presentation';
import { buildEvent } from './utils';
import { groupValidation } from './Blocks/utils';
import { menuItemsForTemplates } from './utils';
import { isEmptyObject } from '@utils/hash';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { AppConfigType } from '@components/v2/Apps/interfaces';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { CommandType } from '@mana/events/interfaces';

export const BADGE_HEIGHT = 37;
export const PADDING_VERTICAL = 12;

export type BlockNodeProps = {
  commands?: Record<string, CommandType>;
  apps?: Record<string, AppNodeType>;
  block: BlockType | PipelineExecutionFrameworkBlockType;
  buttonBeforeRef?: React.RefObject<HTMLDivElement>;
  code?: string;
  dragRef: React.RefObject<HTMLDivElement>;
  executing?: boolean;
  groupSelection?: boolean;
  index?: number;
  interruptExecution: () => void;
  loading?: boolean;
  loadingKernelMutation?: boolean;
  openEditor: (event: any) => void;
  node: NodeItemType;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  submitCodeExecution: (event: React.MouseEvent<HTMLElement>) => void;
  buildContextMenuItemsForGroupBlock: (block: BlockType) => MenuItemType[];
  timerStatusRef?: React.RefObject<HTMLDivElement>;
  updateBlock: (event: any, key: string, value: any, opts?: any) => void;
  teleportIntoBlock: (event: any, target: any) => void;
} & BlockNode;

export default function BlockNodeComponent({
  commands,
  apps,
  block,
  buildContextMenuItemsForGroupBlock,
  buttonBeforeRef,
  code: contentCode,
  groupSelection,
  executing,
  interruptExecution,
  loading,
  loadingKernelMutation,
  node,
  index: indexProp,
  onMount,
  openEditor,
  submitCodeExecution,
  updateBlock,
  teleportIntoBlock,
}: BlockNodeProps & DragAndDropHandlersType & SharedBlockProps) {
  const { name, status, type, uuid } = block;

  const [loadingApp, setLoadingApp] = useState(false);

  const { blocksByGroupRef, groupMappingRef, mutations } = useContext(ModelContext);
  const groups = useMemo(
    () => block?.groups?.map(guuid => groupMappingRef?.current?.[guuid]),
    [block, groupMappingRef],
  );

  const { layoutConfigs, selectedGroupsRef, transformState } = useContext(SettingsContext);
  const layoutConfig = layoutConfigs?.current?.[selectedGroupsRef?.current?.length - 1];

  const selectedGroup =
    groupMappingRef?.current?.[
      selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1]?.uuid
    ];
  const isSiblingGroup =
    selectedGroup?.uuid !== block?.uuid &&
    selectedGroup?.groups?.some((guuid: string) => block?.groups?.includes(guuid as GroupUUIDEnum));

  const isGroup = useMemo(
    () => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type),
    [type],
  );
  const isSelectedGroup = useMemo(
    () => selectedGroup?.uuid === block?.uuid,
    [block, selectedGroup],
  );
  const blocksInGroup = useMemo(
    () => isGroup && Object.values(blocksByGroupRef?.current?.[block?.uuid] ?? {}),
    [isGroup, blocksByGroupRef, block],
  );

  const { error, required, valid } = useMemo(
    () =>
      isGroup
        ? groupValidation(block as FrameworkType, blocksByGroupRef?.current)
        : {
            error: false,
            required: false,
            valid: true,
          },
    [block, blocksByGroupRef, isGroup],
  );

  const colorNames = blockColorNames(node);
  const borders = borderConfigs(node);

  const editorApp = useMemo(() => Object.values(apps ?? {})?.find(app => app?.type === ItemTypeEnum.APP), [apps]);

  const after: any = useMemo(() => {
    if (ItemTypeEnum.NODE === node?.type) return;

    return {
      className: !isGroup && !(editorApp || loadingApp) && stylesBlockNode.showOnHover,
      uuid: node.id,
      ...(ItemTypeEnum.NODE === node?.type
        ? {
            Icon: ip => <Add {...ip} />,
            // borderColor: !draggable && colorNames?.base && 'white',
            menuItems: menuItemsForTemplates(
              block,
              (event: any, block2, template, callback, payloadArg) => {
                const payload = {
                  ...payloadArg,
                  groups: [block2.uuid],
                  uuid: generateUUID(),
                };

                if (template?.uuid) {
                  payload.configuration = {
                    templates: {
                      [template.uuid]: template,
                    },
                  };
                }

                mutations.pipelines.update.mutate({
                  event,
                  onSuccess: () => {
                    callback && callback?.();
                  },
                  payload: {
                    block: payload,
                  },
                });
              },
            ),
          }
        : {
            Icon: ip => {
              const Icon = Code;

              return <Icon {...ip} secondary={editorApp ? true : false} />;
            },
            loading: loadingApp,
            onClick: (event: MouseEvent) => {
              event.preventDefault();
              if (editorApp) {
                const rect = editorApp?.ref?.current?.getBoundingClientRect() ?? {};
                let x = (rect?.left ?? 0) / 2 - (rect?.width ?? 0);
                let y = (rect?.top ?? 0) / 2 + (rect?.height ?? 0) / 2;

                x *= -1;
                y *= -1;

                x = Math.min(0, x);
                y = Math.min(0, y);

                transformState?.current?.handlePanning?.current?.((event ?? null) as any, {
                  x,
                  y,
                });
              } else {
                openEditor(event as any);
                setLoadingApp(true);
              }
            },
          }),
    };
  }, [block, node, isGroup, openEditor, apps, mutations, transformState, editorApp, loadingApp]);

  const before = useMemo(
    () => ({
      Icon: iconProps =>
        executing ?
        <DeleteCircle {...iconProps} colorName={executing ? colorNames?.base : colorNames?.contrast?.monotone} /> :
        <PlayButtonFilled {...iconProps} colorName={executing ? colorNames?.base : colorNames?.contrast?.monotone} />,
      baseColorName: StatusTypeEnum.FAILED === status ? 'red' : colorNames?.base,
      borderColor: executing ? colorNames?.base ?? 'gray' : undefined,
      buttonRef: buttonBeforeRef,
      loading: loadingKernelMutation || (loading && !executing),
      onClick: executing ? interruptExecution : submitCodeExecution,
    }),
    [
      buttonBeforeRef,
      colorNames,
      status,
      submitCodeExecution,
      executing,
      loading,
      loadingKernelMutation,
      interruptExecution,
    ],
  );

  const badge = useMemo(
    () =>
      ItemTypeEnum.NODE === node?.type
        ? {
            Icon: PipeIconVertical,
            baseColorName: colorNames?.base || 'purple',
            label: String(name || uuid || ''),
          }
        : undefined,
    [node, name, uuid, colorNames],
  );

  const label = String(name || uuid || '');

  const inputs = node?.ports?.filter(p => p.subtype === PortSubtypeEnum.INPUT);
  const outputs = node?.ports?.filter(p => p.subtype === PortSubtypeEnum.OUTPUT);

  const inputOutputPairs = useMemo(() => {
    const count = Math.max(inputs?.length, outputs?.length);

    return Array.from({ length: count }).map((_, idx) => {
      const input = inputs?.[idx];
      const output = outputs?.[idx];

      const portDefault = {
        block,
        id: block?.uuid,
        index: idx,
        parent: node,
        subtype: !input ? PortSubtypeEnum.INPUT : !output ? PortSubtypeEnum.OUTPUT : undefined,
        target: null,
        type: ItemTypeEnum.PORT,
      };

      return {
        input: input || portDefault,
        output: output || portDefault,
      };
    });
  }, [block, inputs, node, outputs]);

  const classNames = useMemo(() => {
    const colors = borders?.map(b => b?.baseColorName) ?? [];

    if (error) {
      colors.unshift(...['red', colors?.[0] ?? 'red']);
    }

    const arr = [
      colors?.length >= 2
        ? stylesGradient[['gradient-background-to-top-right', ...colors?.slice?.(0, 2)].join('-')]
        : '',
    ].filter(Boolean);

    if (arr?.length === 0 && colors?.length >= 1) {
      arr.push(stylesGradient[`border-color-${colors?.[0]?.toLowerCase()}`]);
    }

    return arr;
  }, [borders, error]);

  const badgeBase = useMemo(
    () =>
      badge && (
        <TooltipWrapper
          align={TooltipAlign.START}
          hide={block?.type && ![BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(block?.type)}
          horizontalDirection={TooltipDirection.RIGHT}
          justify={TooltipJustify.START}
          tooltip={
            <Grid rowGap={16}>
              <Grid rowGap={8}>
                <Text semibold small>{block?.name || block?.uuid}</Text>
                {block?.description && <Text secondary small>{block?.description}</Text>}
              </Grid>
              {blocksInGroup?.length > 0 && (
                <Grid rowGap={8}>
                  <Text semibold xsmall>
                    Blocks
                  </Text>
                  <Grid rowGap={8}>
                    {blocksInGroup?.map((b: any) => (
                      <Text key={b.uuid} monospace secondary xsmall>
                        {b.name || b.uuid}
                      </Text>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          }
          tooltipStyle={{ maxWidth: 400 }}
          verticalDirection={TooltipDirection.UP}
        >
          <Badge {...badge} />
        </TooltipWrapper>
      ),
    [badge, block, blocksInGroup],
  );

  const buildBadgeRow = useCallback(
    ({
      after: afterArg,
      badgeFullWidth = true,
      inputColorName,
      outputColorName,
    }: {
      after?: AsideType;
      badgeFullWidth?: boolean;
      inputColorName?: string;
      outputColorName?: string;
    }) => (
      <Grid
        alignItems="center"
        autoColumns="auto"
        autoFlow="column"
        columnGap={8}
        justifyContent="space-between"
        templateColumns="1fr"
        templateRows="1fr"
      >
        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          justifyContent="start"
          templateColumns={badgeFullWidth ? (inputColorName ? 'auto 1fr' : '1fr') : 'max-content'}
          templateRows="1fr"
        >
          {inputColorName && <Circle backgroundColor={inputColorName} size={12} />}
          {badgeBase}
        </Grid>
        {(afterArg || outputColorName) && (
          <Grid
            alignItems="center"
            autoColumns="auto"
            autoFlow="column"
            columnGap={8}
            justifyContent="end"
            templateColumns="max-content"
            templateRows="1fr"
          >
            {afterArg && <Aside {...afterArg} />}
            {outputColorName && <Circle backgroundColor={outputColorName} size={12} />}
          </Grid>
        )}
      </Grid>
    ),
    [badgeBase],
  );

  // const connectionRows = useMemo(
  //   () =>
  //     ItemTypeEnum.BLOCK === node?.type &&
  //     inputOutputPairs?.length >= 1 && (
  //       <PanelRows>
  //         {inputOutputPairs?.map(({ input, output }) => (
  //           <Connection
  //             draggable={draggable}
  //             input={input as PortType}
  //             key={[input ? input?.id : '', output ? output?.id : ''].join(':')}
  //             onMount={onMount}
  //             output={output as PortType}
  //           />
  //         ))}
  //       </PanelRows>
  //     ),
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [draggable, node, inputOutputPairs, onMount],
  // );

  const templateConfigurations = useMemo(
    () =>
      (groups ?? block?.frameworks ?? [])?.map(
        (group: PipelineExecutionFrameworkBlockType) =>
          !isEmptyObject(group?.configuration?.templates) &&
          Object.entries(group?.configuration?.templates || {})?.map(
            ([uuid, template]) =>
              block?.configuration?.templates?.[uuid] && (
                <TemplateConfigurations
                  commands={commands}
                  block={block}
                  group={group}
                  key={uuid}
                  teleportIntoBlock={teleportIntoBlock}
                  template={template}
                  updateBlock={updateBlock}
                  uuid={uuid}
                />
              ),
          ),
      ),
    [commands, block, groups, updateBlock, teleportIntoBlock],
  );

  const titleRow = useMemo(
    () => (
      <Grid
        alignItems="center"
        className={stylesBlockNode.showOnHoverContainer}
        columnGap={12}
        id={`${node.id}-title`}
        templateColumns={[
          before ? 'auto' : '1fr',
          before || after ? '1fr' : '',
          before && after ? 'auto' : '',
        ].join(' ')}
        templateRows="1fr"
      >
        {before && <Aside {...before} />}

        <Text semibold small>
          {label}
        </Text>

        {after && <Aside {...after} />}
      </Grid>
    ),
    [after, before, label, node],
  );

  const main = useMemo(
    () => (
      <div
        className={[stylesBlockNode.blockNode]?.filter(Boolean)?.join(' ')}
        style={{
          height: 'fit-content',
          // minWidth: 300,
        }}
      >
        <Grid templateRows="auto">
          <Grid rowGap={8} templateRows="auto">
            {badge &&
              buildBadgeRow({
                after,
                badgeFullWidth: !inputs?.length && isGroup,
              })}
            {!badge && titleRow}
          </Grid>
          <div className={stylesBlockNode.loader}>
            <Loading
              // colorName={colorNames?.hi}
              // colorNameAlt={colorNames?.md}
              position="absolute"
            />
          </div>
          {!groupSelection &&
            (isGroup ? (
              <BlockGroupOverview
                block={block as FrameworkType}
                buildContextMenuItemsForGroupBlock={buildContextMenuItemsForGroupBlock}
                teleportIntoBlock={teleportIntoBlock}
              />
            ) : (
              <Grid rowGap={8} templateRows="auto">
                {/* {connectionRows} */}
                {templateConfigurations}
                {isEmptyObject(block?.configuration?.templates) && (
                  <PanelRows padding={false}>
                    <Grid justifyItems="start" padding={12} rowGap={4} templateColumns="auto">
                      {false && contentCode && (
                        <TooltipWrapper
                          align={TooltipAlign.START}
                          horizontalDirection={TooltipDirection.LEFT}
                          justify={TooltipJustify.START}
                          tooltip={
                            contentCode && (
                              <Markdown
                                code={{ monospace: true, small: true }}
                                pre={{ monospace: true, small: true }}
                                span={{ monospace: true, small: true }}
                              >
                                {`${'```'}python
  ${contentCode}
  ${'```'}`}
                              </Markdown>
                            )
                          }
                        >
                          <Text semibold xsmall>
                            Custom code
                          </Text>
                        </TooltipWrapper>
                      )}
                      {
                        <Text semibold xsmall>
                          Custom code
                        </Text>
                      }
                    </Grid>
                    <Grid
                      alignItems="stretch"
                      baseLeft
                      baseRight
                      columnGap={8}
                      justifyContent="space-between"
                      smallBottom
                      smallTop
                      style={{
                        gridTemplateColumns: 'minmax(0px, max-content) auto',
                        minWidth: 240,
                      }}
                    >
                      <Text secondary small>
                        Language
                      </Text>

                      <Text secondary small>
                        {LANGUAGE_DISPLAY_MAPPING[block?.language] ?? ''}
                      </Text>
                    </Grid>
                  </PanelRows>
                )}
                {BlockTypeEnum.PIPELINE === block?.type && <div />}
              </Grid>
            ))}
        </Grid>
      </div>
    ),
    [
      badge,
      buildContextMenuItemsForGroupBlock,
      buildBadgeRow,
      block,
      // connectionRows,
      templateConfigurations,
      titleRow,
      teleportIntoBlock,
      after,
      contentCode,
      isGroup,
      inputs,
      groupSelection,
    ],
  );

  const renderNodeAsGroupSelection = useMemo(
    () => isSelectedGroup && (block?.children?.length > 0 || blocksInGroup?.length > 0),
    [isSelectedGroup, block, blocksInGroup],
  );

  const content = useMemo(
    () => (
      <GradientContainer
        // Only use gradient borders when block selected
        className={[...classNames]?.filter(Boolean)?.join(' ')}
        // motionProps={motionProps}
        role={ElementRoleEnum.CONTENT}
        style={{
          height: renderNodeAsGroupSelection ? '100%' : 'fit-content',
          minWidth: isGroup ? 320 : undefined,
          position: 'relative',
          width: renderNodeAsGroupSelection ? '100%' : 'fit-content',
        }}
      >
        {main}
      </GradientContainer>
    ),
    [renderNodeAsGroupSelection, classNames, main, isGroup],
  );

  useEffect(() => {
    if (loadingApp && editorApp) {
      setLoadingApp(false);
    }
  }, [loadingApp, editorApp]);

  const teleportBlock = useMemo(
    () => (
      <TeleportBlock
        block={block}
        buildBadgeRow={buildBadgeRow}
        index={indexProp}
        node={node}
        role={ElementRoleEnum.CONTENT}
        selectedGroup={selectedGroup}
      />
    ),
    [block, buildBadgeRow, indexProp, node, selectedGroup],
  );

  if (isSiblingGroup) return teleportBlock;

  return (
    <>
      {executing && <Tag left statusVariant timer top />}
      {isSiblingGroup && teleportBlock}
      {!isSiblingGroup && content}
    </>
  );
}
