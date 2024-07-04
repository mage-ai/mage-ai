import Aside from './Blocks/Aside';
import Tag from '@mana/components/Tag';
import Badge from '@mana/elements/Badge';
import BlockType from '@interfaces/BlockType';
import Circle from '@mana/elements/Circle';
import Connection from './Blocks/Connection';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import Loading from '@mana/components/Loading';
import PanelRows from '@mana/elements/PanelRows';
import TemplateConfigurations from './Blocks/TemplateConfigurations';
import Text from '@mana/elements/Text';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesGradient from '@styles/scss/elements/GradientContainer.module.scss';
import { AddV2, Code, Grab, PipeIconVertical, PlayButtonFilled, Pause, Infinite } from '@mana/icons';
import { AppTypeEnum, AppSubtypeEnum } from '../../Apps/constants';
import { EventOperationEnum } from '@mana/shared/interfaces';
import { DragAndDropHandlersType, SharedBlockProps } from './types';
import { NodeItemType, PortType, NodeType } from '../interfaces';
import { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { ItemTypeEnum, PortSubtypeEnum } from '../types';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { TooltipWrapper } from '@context/Tooltip';
import { borderConfigs, blockColorNames } from './presentation';
import { getBlockColor } from '@mana/themes/blocks';
import { handleGroupTemplateSelect, menuItemsForTemplates } from './utils';
import { isEmptyObject } from '@utils/hash';
import { buildEvent } from './utils';
import { useMemo } from 'react';
import { zIndex } from 'styled-system';

type BlockNodeProps = {
  block: BlockType | PipelineExecutionFrameworkBlockType;
  buttonBeforeRef?: React.RefObject<HTMLDivElement>;
  collapsed?: boolean;
  draggable?: boolean;
  timerStatusRef?: React.RefObject<HTMLDivElement>;
  node: NodeItemType;
  nodeRef: React.RefObject<HTMLDivElement>;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  submitCodeExecution: (event: React.MouseEvent<HTMLElement>) => void;
  submitEventOperation: (event: Event, options?: { args: any[] }) => void;
};

export function BlockNode({
  block,
  buttonBeforeRef,
  collapsed,
  draggable,
  handlers,
  node,
  timerStatusRef,
  nodeRef,
  onMount,
  submitCodeExecution,
  submitEventOperation,
  updateBlock,
}: BlockNodeProps & DragAndDropHandlersType & SharedBlockProps) {
  const { name, status, uuid } = block;

  const colorNames = blockColorNames(node)
  const borders = borderConfigs(node);
  const after: any = useMemo(() => ({
    className: stylesBlockNode.showOnHover,
    uuid: node.id,
    ...(ItemTypeEnum.NODE === node?.type
      ? {
        Icon: draggable ? Grab : AddV2,
        menuItems: menuItemsForTemplates(block, (event: any, block2, template) => handleGroupTemplateSelect(
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
  }), [draggable, submitEventOperation, node, nodeRef, block]);

  const before = useMemo(() => ({
    Icon: (iconProps) => {
      return (
        <>
          <PlayButtonFilled {...iconProps} className={[
            stylesBlockNode['display-ifnot-executing'],
          ].join(' ')}
          />
          <Pause {...iconProps} className={stylesBlockNode['display-if-executing']} />
        </>
      );
    },
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
  }, [borders]);

  const badgeRow = useMemo(
    () =>
      badge && (
        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          id={`${node.id}-badge`}
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
            templateColumns="max-content"
            templateRows="1fr"
          >
            {false && inputs?.length >= 1 && (
              <Circle
                backgroundColor={
                  getBlockColor(inputs?.[0]?.target?.block?.type, { getColorName: true })?.names
                    ?.base || 'gray'
                }
                size={12}
              />
            )}
            {badge &&
              <TooltipWrapper
                hide={block?.type && ![BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(block?.type)}
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
            }
          </Grid>
          <Grid
            alignItems="center"
            autoColumns="auto"
            autoFlow="column"
            columnGap={8}
            justifyContent="end"
            templateColumns="max-content"
            templateRows="1fr"
          >
            {after && <Aside {...after} />}
            {false && outputs?.length >= 1 && (
              <Circle
                backgroundColor={
                  getBlockColor(outputs?.[0]?.target?.block?.type, { getColorName: true })?.names
                    ?.base || 'gray'
                }
                size={12}
              />
            )}
          </Grid>
        </Grid>
      ),
    [after, badge, block, inputs, node, outputs],
  );

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

  const main = useMemo(
    () => (
      <div
        className={[
          stylesBlockNode.blockNode,
        ]?.filter(Boolean)?.join(' ')}
      >
        <Grid templateRows="auto">
          <Grid rowGap={8} templateRows="auto">
            {badgeRow}
            {!badge && titleRow}
          </Grid>
          <div className={stylesBlockNode.loader}>
            <Loading
              // colorName={colorNames?.hi}
              // colorNameAlt={colorNames?.md}
              position="absolute"
            />
          </div>
          <Grid rowGap={8} templateRows="auto">
            {connectionRows}
            {templateConfigurations}
            {BlockTypeEnum.PIPELINE === block?.type && <div />}
          </Grid>
        </Grid>
      </div>
    ),
    [badge, badgeRow, block, connectionRows, templateConfigurations, titleRow],
  );

  return (
    <>
      <Tag
        className={stylesBlockNode['display-if-executing']}
        ref={timerStatusRef}
        statusVariant
        style={{
          left: -10,
          position: 'absolute',
          top: -10,
          zIndex: 7,
        }}
      >
        Hello
      </Tag >
      <GradientContainer
        // Only use gradient borders when block selected
        className={[
          ...classNames,
        ]?.filter(Boolean)?.join(' ')}
        style={{ position: 'relative' }}
      >
        {main}
      </GradientContainer>
    </>
  );
}
