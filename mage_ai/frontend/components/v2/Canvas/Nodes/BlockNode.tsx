import Aside from './Blocks/Aside';
import { TooltipDirection, TooltipJustify, TooltipAlign, HideTooltipReason, TooltipLayout, useTooltip } from '@context/Tooltip/Context';
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
import { AddV2, Code, Grab, PipeIconVertical, PlayButtonFilled, Pause, Infinite } from '@mana/icons';
import { AppTypeEnum, AppSubtypeEnum } from '../../Apps/constants';
import { AsideType, DragAndDropHandlersType, SharedBlockProps } from './types';
import { BlockNode } from './interfaces';
import { EventOperationEnum } from '@mana/shared/interfaces';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { ItemStatusEnum, ItemTypeEnum, LayoutConfigDirectionEnum, PortSubtypeEnum } from '../types';
import { NodeItemType, PortType } from '../interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { TooltipWrapper } from '@context/Tooltip';
import { borderConfigs, blockColorNames } from './presentation';
import { buildEvent } from './utils';
import { groupValidation } from './Blocks/utils';
import { handleGroupTemplateSelect, menuItemsForTemplates } from './utils';
import { isEmptyObject } from '@utils/hash';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';

type BlockNodeProps = {
  block: BlockType | PipelineExecutionFrameworkBlockType;
  buttonBeforeRef?: React.RefObject<HTMLDivElement>;
  timerStatusRef?: React.RefObject<HTMLDivElement>;
  index?: number;
  node: NodeItemType
  nodeRef: React.RefObject<HTMLDivElement>;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  submitCodeExecution: (event: React.MouseEvent<HTMLElement>) => void;
} & BlockNode;

export default function BlockNodeComponent({
  block,
  buttonBeforeRef,
  collapsed,
  draggable,
  handlers,
  node,
  nodeRef,
  index: indexProp,
  onMount,
  submitCodeExecution,
  submitEventOperation,
  timerStatusRef,
  updateBlock,
}: BlockNodeProps & DragAndDropHandlersType & SharedBlockProps) {
  const { name, status, type, uuid } = block;
  const [level, setLevel] = useState<number>(0);

  const { blocksByGroupRef } = useContext(ModelContext);
  const { activeLevel, layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const layoutConfig = layoutConfigs?.current?.[activeLevel?.current - 1]?.current;
  const selectedGroup = selectedGroupsRef?.current?.[activeLevel?.current - 1];
  const isSiblingGroup = selectedGroup?.uuid !== block?.uuid &&
    selectedGroup?.groups?.some(g => block?.groups?.includes(g.uuid as GroupUUIDEnum));
  const isGroup =
    useMemo(() => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type), [type]);
  const isSelectedGroup = useMemo(() => selectedGroup?.uuid === block?.uuid, [block, selectedGroup]);
  const blocksInGroup = useMemo(() => isGroup
    && Object.values(blocksByGroupRef?.current?.[block?.uuid] ?? {}),
    [isGroup, blocksByGroupRef, block]);

  const { error, required, valid } = useMemo(
    () => isGroup ? groupValidation(block as FrameworkType, blocksByGroupRef?.current) : {
      error: false,
      required: false,
      valid: true,
    }, [block, blocksByGroupRef, isGroup]);

  useEffect(() => {
    if (activeLevel?.current !== null) {
      if (activeLevel.current === node?.level) {
        setLevel(activeLevel.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, node]);

  // useDispatchMounted(node, nodeRef);

  const colorNames = blockColorNames(node);
  const borders = borderConfigs(node);
  const after: any = useMemo(() => ({
    className: !isGroup && stylesBlockNode.showOnHover,
    uuid: node.id,
    ...(ItemTypeEnum.NODE === node?.type
      ? {
        Icon: draggable ? Grab : AddV2,
        menuItems: menuItemsForTemplates(block, (
          event: any, block2, template
        ) => handleGroupTemplateSelect(
          event,
          block2,
          template,
          submitEventOperation,
        )),
        // onClick: (event: MouseEvent) =>
        //   handleClickGroupMenu(event, node as NodeType, submitEventOperation, nodeRef),
      }
      : {
        Icon: draggable ? Grab : Code,
        onClick: (event: MouseEvent) => submitEventOperation(buildEvent(
          event, EventOperationEnum.APP_START, node, nodeRef, block,
        ), {
          args: [
            AppTypeEnum.EDITOR,
            AppSubtypeEnum.CANVAS,
          ],
        }),
      }),
  }), [draggable, submitEventOperation, node, nodeRef, block, isGroup]);

  const before = useMemo(() => ({
    Icon: (iconProps) => (
      <>
        <PlayButtonFilled {...iconProps} className={[
          stylesBlockNode['display-ifnot-executing'],
        ].join(' ')}
        />
        <Pause {...iconProps} className={stylesBlockNode['display-if-executing']} />
      </>
    ),
    baseColorName:
      StatusTypeEnum.FAILED === status
        ? 'red'
        : StatusTypeEnum.EXECUTED === status
          ? 'green'
          : 'blue',
    buttonRef: buttonBeforeRef,
    className: stylesBlockNode.beforeButton,
    onClick: submitCodeExecution,
  }), [buttonBeforeRef, status, submitCodeExecution]);

  const badge = useMemo(() => ItemTypeEnum.NODE === node?.type
    ? {
      Icon: collapsed ? Infinite : PipeIconVertical,
      baseColorName: colorNames?.base || 'purple',
      label: String(name || uuid || ''),
    }
    : undefined
    , [node, name, uuid, collapsed, colorNames]);

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
      colors.unshift(...['red', (colors?.[0] ?? 'red')]);
    }

    const arr = [
      colors?.length >= 2
        ? stylesGradient[
        [
          'gradient-background-to-top-right',
          ...colors?.slice?.(0, 2),
        ].join('-')
        ]
        : '',
    ].filter(Boolean);

    if (arr?.length === 0 && colors?.length >= 1) {
      arr.push(stylesGradient[`border-color-${colors?.[0]?.toLowerCase()}`]);
    }

    return arr;
  }, [borders, error]);

  const badgeBase = useMemo(() => badge &&
    <TooltipWrapper
      align={TooltipAlign.START}
      hide={block?.type && ![BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(block?.type)}
      horizontalDirection={TooltipDirection.LEFT}
      verticalDirection={TooltipDirection.UP}
      justify={TooltipJustify.START}
      tooltip={
        <Grid rowGap={4}>
          <Text semibold>
            {block?.name || block?.uuid}
          </Text >
          {block?.description &&
            <Text secondary>
              {block?.description}
            </Text>
          }
        </Grid>
      }
      tooltipStyle={{ maxWidth: 400 }}
    >
      <Badge {...badge} />
    </TooltipWrapper>
    , [badge, block]);

  const buildBadgeRow = useCallback(({
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
        templateColumns={badgeFullWidth
          ? inputColorName
            ? 'auto 1fr'
            : '1fr'
          : 'max-content'}
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
  ), [badgeBase]);

  const connectionRows = useMemo(
    () =>
      ItemTypeEnum.BLOCK === node?.type && inputOutputPairs?.length >= 1 && (
        <PanelRows>
          {inputOutputPairs?.map(({ input, output }) => (
            <Connection
              draggable={draggable}
              handlers={handlers}
              input={input as PortType}
              key={[input ? input?.id : '', output ? output?.id : ''].join(
                ':',
              )}
              onMount={onMount}
              output={output as PortType}
            />
          ))}
        </PanelRows>

        // eslint-disable-next-line react-hooks/exhaustive-deps
      ),
    [draggable, handlers, node, inputOutputPairs, onMount],
  );

  const templateConfigurations = useMemo(
    () =>
      (node?.block?.frameworks ?? [])?.map(
        (group: PipelineExecutionFrameworkBlockType) =>
          !isEmptyObject(group?.configuration?.templates) &&
          Object.entries(group?.configuration?.templates || {})?.map(
            ([uuid, template]) => node?.block?.configuration?.templates?.[uuid] && (
              <TemplateConfigurations
                block={node?.block}
                group={group}
                key={uuid}
                template={template}
                updateBlock={updateBlock}
                uuid={uuid}
              />
            )),
      ),
    [node, updateBlock],
  );

  const titleRow = useMemo(
    () => (
      <Grid
        alignItems="center"
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

  const main = useMemo(() => (
    <AnimatePresence>
      <div
        className={[
          stylesBlockNode.blockNode,
        ]?.filter(Boolean)?.join(' ')}
        style={{
          height: 'fit-content',
          minWidth: 300,
        }}
      >
        <Grid templateRows="auto">
          <Grid rowGap={8} templateRows="auto">
            {badge && buildBadgeRow({
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
          {isGroup
            ? <BlockGroupOverview block={block as FrameworkType} />
            : (
              <Grid rowGap={8} templateRows="auto">
                {connectionRows}
                {templateConfigurations}
                {BlockTypeEnum.PIPELINE === block?.type && <div />}
              </Grid>
            )}
        </Grid>
      </div>
    </AnimatePresence>
  ), [badge, buildBadgeRow, block, connectionRows, templateConfigurations, titleRow, after,
    isGroup, inputs],
  );

  const content = useMemo(() => (
    <GradientContainer
      // Only use gradient borders when block selected
      className={[
        ...classNames,
      ]?.filter(Boolean)?.join(' ')}
      // motionProps={motionProps}
      role={ElementRoleEnum.CONTENT}
      style={{
        height: isSelectedGroup && blocksInGroup?.length > 0
          ? '100%'
          : 'fit-content',
        position: 'relative',
      }}
    >

      {main}
    </GradientContainer >
  ), [blocksInGroup, classNames, isSelectedGroup, main,
    // motionProps,
  ]);

  const teleportBlock = useMemo(() => (
    <TeleportBlock
      block={block}
      buildBadgeRow={buildBadgeRow}
      index={indexProp}
      node={node}
      role={ElementRoleEnum.CONTENT}
      selectedGroup={selectedGroup}
    />
  ), [block, buildBadgeRow, indexProp, node, selectedGroup]);

  if (isSiblingGroup) return teleportBlock;

  return content;
}
