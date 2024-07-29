import Section from '@mana/elements/Section';
import { formatDurationFromEpoch } from '@utils/string';
import Aside from './Blocks/Aside';
import Button from '@mana/elements/Button';
import { getUpDownstreamColors } from './Blocks/utils';
import BlockGroupContent from './Blocks/BlockGroupContent';
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
import Badge, { BadgeType} from '@mana/elements/Badge';
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
  CodeV2,
  Grab,
  PipeIconVertical,
  PlayButton,
  PlayButtonFilled,
  DeleteCircle,
  Infinite,
  StatusComplete,
  Lightning,
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
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { AppConfigType } from '@components/v2/Apps/interfaces';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { CommandType } from '@mana/events/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import {
  BADGE_HEIGHT,
  PADDING_VERTICAL,
  BLOCK_NODE_MIN_WIDTH,
  GROUP_NODE_MIN_WIDTH,
  SELECTED_GROUP_NODE_MIN_WIDTH,
} from './Blocks/constants'
import Timer from '@mana/components/Timer';
import { range } from '@utils/array';

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
  openEditor: (event: any, callback?: () => void) => void;
  node: NodeItemType;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  submitCodeExecution: (event: React.MouseEvent<HTMLElement>) => void;
  buildContextMenuItemsForGroupBlock: (block: BlockType) => MenuItemType[];
  timerStatusRef?: React.RefObject<HTMLDivElement>;
  updateBlock: (event: any, key: string, value: any, opts?: any) => void;
  blockGroupStatusRef?: React.MutableRefObject<HTMLDivElement>;
  teleportIntoBlock: (event: any, target: any) => void;
  menuItemsForTemplates: MenuItemType[];
} & BlockNode;

export default function BlockNodeComponent({
  commands,
  apps,
  block,
  buildContextMenuItemsForGroupBlock,
  code: contentCode,
  groupSelection,
  executing,
  blockGroupStatusRef,
  interruptExecution,
  loading,
  loadingKernelMutation,
  node,
  index: indexProp,
  menuItemsForTemplates,
  openEditor,
  submitCodeExecution,
  updateBlock,
  teleportIntoBlock,
}: BlockNodeProps & DragAndDropHandlersType & SharedBlockProps) {
  const { name, status, type, uuid } = block;
  const timeRef = useRef<number>(null);

  // const [loadingApp, setLoadingApp] = useState(false);
  const loadingApp = false;

  const { blocksByGroupRef, groupMappingRef, mutations, blockMappingRef, groupsByLevelRef } = useContext(ModelContext);
  const groups = useMemo(
    () => block?.groups?.map(guuid => groupMappingRef?.current?.[guuid]),
    [block, groupMappingRef],
  );

  const { activeLevel, layoutConfigs, selectedGroupsRef, transformState } = useContext(SettingsContext);
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

  const colorNames = useMemo(() => blockColorNames(node, isSelectedGroup), [isSelectedGroup, node]);
  const borders = useMemo(() => borderConfigs(node, isSelectedGroup), [
    node,
    isSelectedGroup,
  ]);

  const editorApp = useMemo(() => Object.values(apps ?? {})?.find(app => app?.type === ItemTypeEnum.APP), [apps]);

  const badge = useMemo(
    () =>
      ItemTypeEnum.NODE === node?.type
        ? {
            // Icon: PipeIconVertical,
            baseColorName: colorNames?.base || 'purple',
            label: String(name || uuid || ''),
          }
        : undefined,
    [node, name, uuid, colorNames],
  );

  const label = String(name || uuid || '');

  const inputs = node?.ports?.filter(p => p.subtype === PortSubtypeEnum.INPUT);
  const outputs = node?.ports?.filter(p => p.subtype === PortSubtypeEnum.OUTPUT);

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

  const BuildBadgeRow = useCallback(
    ({
      badge: badgeProps,
      after: afterArg,
      badgeFullWidth = true,
      children: children2,
      inputColorName,
      outputColorName,
      isGroup,
    }: {
      after?: AsideType;
      badge?: BadgeType;
      badgeFullWidth?: boolean;
      children?: any;
      inputColorName?: string;
      isGroup?: boolean;
      outputColorName?: string;
    }) => {
      let incolor = inputColorName;
      let outcolor = outputColorName;

      if (isGroup) {
        const groupsInLevel = groupsByLevelRef?.current?.[activeLevel?.current - 2];

        const { downstreamInGroup, upstreamInGroup } = getUpDownstreamColors(
          block,
          groupsInLevel,
          blocksByGroupRef?.current,
          {
            blockMapping: blockMappingRef?.current,
            groupMapping: groupMappingRef?.current,
          },
        );

        const isup = upstreamInGroup?.length > 0;
        const isdn = downstreamInGroup?.length > 0;

        incolor = isup && upstreamInGroup?.[0]?.colorName;
        outcolor = isdn && downstreamInGroup?.[0]?.colorName;
      } else {
        incolor = inputColorName;
        outcolor = outputColorName;
      }

      const afterEl = (afterArg || outcolor) && (
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
          {outcolor && <Circle backgroundColor={outcolor} size={12} />}
        </Grid>
      );

      return (
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
            templateColumns={badgeFullWidth
              ? (badge ? '1fr' : (incolor ? 'auto 1fr' : '1fr'))
              : 'max-content'}
            templateRows="1fr"
          >
            {!badge && incolor && <Circle backgroundColor={incolor} size={12} />}

            {badge && (
              <Badge
                after={afterEl}
                before={incolor && <Circle backgroundColor={incolor} size={12} />}
                {...{
                ...badge,
                ...badgeProps,
                }}
              >
                {children2}
              </Badge>
            )}
          </Grid>

        {!badge && afterEl}
      </Grid>
    );
  },
    [badge, block, blocksInGroup],
  );

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
                  colorNames={colorNames}
                  uuid={uuid}
                />
              ),
          ),
      ),
    [colorNames, commands, block, groups, updateBlock, teleportIntoBlock],
  );

  const inputOutputMemo = useMemo(() => {
    const count = Math.max(block?.upstream_blocks?.length ?? 0, block?.downstream_blocks?.length ?? 0);

    return range(count).map((idx: number) => {
      const [upitem, dnitem] = [
        block?.upstream_blocks?.[idx],
        block?.downstream_blocks?.[idx],
      ].map((buuid: string) => {
        if (!buuid) return null;

        const block2 = blockMappingRef?.current?.[buuid];
        const color = getBlockColor(block2?.type, { getColorName: true }, block)?.names?.base;
        return {
          ...block2,
          color,
        };
      });

      return (
        <Section key={[upitem?.uuid, dnitem?.uuid].filter(Boolean).join('->')} small withBackground>
          <Grid
            columnGap={16} alignItems="center" justifyContent="space-between" autoFlow="column" templateRows="1fr"
            paddingLeft={4}
            paddingRight={4}
            paddingTop={3}
            paddingBottom={3}
          >
            <Grid columnGap={10} alignItems="center" justifyContent="start" templateColumns="auto 1fr" templateRows="1fr">
              <Circle
                backgroundColor={upitem?.color ?? undefined}
                border={upitem?.color ? undefined : 'var(--borders-width) var(--borders-style) var(--fonts-color-text-secondary)'}
                size={12}
              />

              <Text secondary small>
                {upitem?.name ?? upitem?.uuid ?? ''}
              </Text>
            </Grid>

            <Grid columnGap={10} alignItems="center" justifyContent="end" templateColumns="1fr auto" templateRows="1fr">
              <Text secondary small>
                {dnitem?.name ?? dnitem?.uuid ?? ''}
              </Text>

              <Circle
                backgroundColor={dnitem?.color ?? undefined}
                border={dnitem?.color ? undefined : 'var(--borders-width) var(--borders-style) var(--fonts-color-text-secondary)'}
                size={12}
              />
            </Grid>
          </Grid>
        </Section>
      );
    })
  }, [
    block,
    blockMappingRef?.current,
  ]);

  const main = useMemo(
    () =>
      <div
        className={[stylesBlockNode.blockNode]?.filter(Boolean)?.join(' ')}
        style={{
          height: renderNodeAsGroupSelection ? undefined : 'fit-content',
          // minWidth: 300,
        }}
      >
        {isGroup ?
          (
            <BlockGroupContent
              BuildBadgeRow={({ fullWidth, ...rest }) => badge && BuildBadgeRow({
                badgeFullWidth: fullWidth || (!inputs?.length && isGroup),
                ...rest,
              })}
              blockGroupStatusRef={blockGroupStatusRef}
              block={block as FrameworkType}
              blocks={blocksInGroup as BlockType[]}
              menuItems={menuItemsForTemplates}
              selected={isSelectedGroup}
              teleportIntoBlock={teleportIntoBlock}
            >
              {!isSelectedGroup && (block?.children?.length ?? 0) === 0 && (
                <BlockGroupOverview
                  block={block as FrameworkType}
                  buildContextMenuItemsForGroupBlock={buildContextMenuItemsForGroupBlock}
                  teleportIntoBlock={teleportIntoBlock}
                />
              )}
            </BlockGroupContent>
          )
      : (
          <Grid templateRows="auto" rowGap={8}>
            <Grid rowGap={8} templateRows="auto">
              <Grid columnGap={8} templateColumns="1fr auto">
                <Badge
                  baseColorName="gray"
                  label={block?.name ?? block?.uuid}
                />

                <Button
                  Icon={iconProps =>
                    executing ?
                    <DeleteCircle
                      {...iconProps}
                      colorName={executing ? colorNames?.base : undefined}
                      size={16}
                    /> :
                    <PlayButton
                      {...iconProps}
                      colorName={executing ? colorNames?.base : colorNames?.contrast?.monotone}
                      size={16}
                    />
                  }
                  backgroundcolor={executing ? 'transparent' : colorNames?.base}
                  color={executing ? undefined : colorNames?.contrast?.monotone}
                  loading={loadingKernelMutation || (loading && !executing)}
                  onClick={executing ? interruptExecution : submitCodeExecution}
                  small
                  style={{
                    borderColor: executing ? `var(--colors-${colorNames?.base})` : 'transparent',
                  }}
                >
                  {executing ? '' : 'Run'}
                </Button>
              </Grid>

              <Grid columnGap={8} templateColumns="1fr auto">
                <Section small withBackground>
                  <Grid columnGap={8} padding={4} templateColumns="auto 1fr">
                    {!executing && timeRef.current ? <StatusComplete success size={16} /> : <Lightning muted={!executing} warning={executing} size={16} />}

                    <Text muted={!executing && !timeRef.current} semibold small>
                      {executing && <Timer onChange={value => timeRef.current = value } /> }
                      {!executing && timeRef.current && formatDurationFromEpoch(timeRef.current)}
                      {!executing && !timeRef.current && 'Not run yet'}
                    </Text>
                  </Grid>
                </Section>

                <Button
                  Icon={ip => <CodeV2 {...ip} secondary={editorApp ? true : false} size={16} />}
                  onClick={(event: any) => {
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
                      // setLoadingApp(true);
                    }
                  }}
                  loading={loadingApp}
                  small
                >
                  Edit
                </Button>
              </Grid>

              {inputOutputMemo}
            </Grid>

            <Grid rowGap={8} templateRows="auto">
              {templateConfigurations}
              {isEmptyObject(block?.configuration?.templates) && (
                <PanelRows padding={false}>
                  <Grid
                    alignItems="stretch"
                    baseLeft
                    baseRight
                    columnGap={8}
                    justifyContent="space-between"
                    paddingBottom={11}
                    paddingLeft={12}
                    paddingRight={12}
                    paddingTop={11}
                    style={{
                      gridTemplateColumns: 'minmax(0px, max-content) auto',
                      minWidth: 240,
                    }}
                  >
                    <Text medium secondary small>
                      Language
                    </Text>

                    <Text medium secondary small>
                      {LANGUAGE_DISPLAY_MAPPING[block?.language] ?? ''}
                    </Text>
                  </Grid>
                </PanelRows>
              )}

              {BlockTypeEnum.PIPELINE === block?.type && <div />}
            </Grid>
          </Grid>
        )}
    </div>,
    [
      badge,
      buildContextMenuItemsForGroupBlock,
      BuildBadgeRow,
      blocksInGroup,
      blockGroupStatusRef,
      isSelectedGroup,
      selectedGroup,
      block,
      templateConfigurations,
      editorApp,
      teleportIntoBlock,
      contentCode,
      isGroup,
      inputs,
      menuItemsForTemplates,
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
          minWidth: isGroup ? (renderNodeAsGroupSelection ? SELECTED_GROUP_NODE_MIN_WIDTH : GROUP_NODE_MIN_WIDTH) : BLOCK_NODE_MIN_WIDTH,
          position: 'relative',
          // Use 100% if we want it to be fixed width based on the parent rect
          // width: renderNodeAsGroupSelection ? 'fit-content' : 'fit-content',
        }}
      >
        {main}
      </GradientContainer>
    ),
    [renderNodeAsGroupSelection, classNames, main, isGroup],
  );

  // const { setSelectedGroup } = useContext(EventContext);
  // const teleportBlock = useMemo(
  //   () =>
  //   <TeleportBlock
  //     block={block}
  //     BuildBadgeRow={BuildBadgeRow}
  //     index={indexProp}
  //     node={node}
  //     role={ElementRoleEnum.CONTENT}
  //     selectedGroup={selectedGroup}
  //     setSelectedGroup={setSelectedGroup}
  //   />
  //   ,
  //   [block, BuildBadgeRow, indexProp, node, selectedGroup, isGroup],
  // );

  return (
    <>
      {content}
    </>
  );
}
