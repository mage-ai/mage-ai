import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import Badge from '@mana/elements/Badge';
import Circle from '@mana/elements/Circle';
import { ConfigurationOptionType, BorderConfigType, TitleConfigType } from './types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesGradient from '@styles/scss/elements/GradientContainer.module.scss';
import { getBlockColor } from '@mana/themes/blocks';
import Aside from './Blocks/Aside';
import { DragItem, PortType } from '../interfaces';
import GradientContainer from '@mana/elements/Gradient';
import Connection from './Blocks/Connection';
import PanelRows from '@mana/elements/PanelRows';
import TemplateConfigurations from './Blocks/TemplateConfigurations';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { TooltipWrapper } from '@context/Tooltip';
import { isEmptyObject } from '@utils/hash';
import { useMemo } from 'react';
import { ItemTypeEnum, PortSubtypeEnum } from '../types';
import { DragAndDropHandlersType, SharedBlockProps } from './types';
import { SubmitEventOperationType } from '@mana/shared/interfaces';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';

type BlockNodeProps = {
  borderConfig?: BorderConfigType;
  draggable?: boolean;
  item: DragItem;
  collapsed?: boolean;
  configurationOptions?: ConfigurationOptionType[];
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  titleConfig?: TitleConfigType;
};

export function BlockNode({
  block,
  borderConfig,
  draggable,
  handlers,
  item,
  onMount,
  titleConfig,
  updateBlock,
}: BlockNodeProps & DragAndDropHandlersType & SharedBlockProps) {
  const { borders } = borderConfig || {};
  const { asides, badge } = titleConfig || {};
  const { after, before } = asides || {};

  const inputs = item?.ports?.filter(p => p.subtype === PortSubtypeEnum.INPUT);
  const outputs = item?.ports?.filter(p => p.subtype === PortSubtypeEnum.OUTPUT);

  const isPipeline = useMemo(() => BlockTypeEnum.PIPELINE === block?.type, [block]);
  const isGroup = useMemo(() => BlockTypeEnum.GROUP === block?.type, [block]);

  const inputOutputPairs = useMemo(() => {
    const count = Math.max(inputs?.length, outputs?.length);

    return Array.from({ length: count }).map((_, idx) => {
      const input = inputs?.[idx];
      const output = outputs?.[idx];

      const portDefault = {
        block,
        id: block?.uuid,
        index: idx,
        parent: item,
        subtype: !input ? PortSubtypeEnum.INPUT : !output ? PortSubtypeEnum.OUTPUT : undefined,
        target: null,
        type: ItemTypeEnum.PORT,
      };

      return {
        input: input || portDefault,
        output: output || portDefault,
      };
    });
  }, [block, inputs, item, outputs]);

  const classNames = [
    true || borders?.length >= 2
      ? stylesGradient[
      [
        'gradient-background-to-top-right',
        ...(borders ?? [])
          .concat([
            // { baseColorName: 'yellow' },
            // { baseColorName: 'green' },
          ])
          ?.slice?.(0, 2)
          ?.map(b => b.baseColorName),
      ].join('-')
      ]
      : '',
  ].filter(b => b);
  if (classNames?.length === 0 && borders?.length >= 1) {
    classNames.push(stylesGradient[`border-color-${borders?.[0]?.baseColorName?.toLowerCase()}`]);
  }

  const badgeRow = useMemo(
    () =>
      badge && (
        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          id={`${item.id}-badge`}
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
    [after, badge, block, inputs, item, outputs],
  );

  const connectionRows = useMemo(
    () =>
      ItemTypeEnum.BLOCK === item?.type && inputOutputPairs?.length >= 1 && (
        <PanelRows>
          {inputOutputPairs?.map(({ input, output }, idx: number) => (
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
    [draggable, handlers, item, inputOutputPairs, onMount],
  );

  const templateConfigurations = useMemo(
    () =>
      (item?.block?.frameworks ?? [])?.map(
        (group: PipelineExecutionFrameworkBlockType) =>
          !isEmptyObject(group?.configuration?.templates) &&
          Object.entries(group?.configuration?.templates || {})?.map(
            ([uuid, template]) => item?.block?.configuration?.templates?.[uuid] && (
              <TemplateConfigurations
                block={item?.block}
                group={group}
                key={uuid}
                template={template}
                updateBlock={updateBlock}
                uuid={uuid}
              />
            )),
      ),
    [item, updateBlock],
  );

  const titleRow = useMemo(
    () => (
      <Grid
        alignItems="center"
        columnGap={12}
        id={`${item.id}-title`}
        templateColumns={[
          before ? 'auto' : '1fr',
          before || after ? '1fr' : '',
          before && after ? 'auto' : '',
        ].join(' ')}
        templateRows="1fr"
      >
        {before && <Aside {...before} />}

        <Text semibold small>
          {titleConfig?.label}
        </Text>

        {after && <Aside {...after} />}
      </Grid>
    ),
    [after, before, item, titleConfig],
  );

  const main = useMemo(
    () => (
      <div className={styles.blockNode}>
        <Grid rowGap={8} templateRows="auto">
          {badgeRow}
          {!badge && titleRow}
          {connectionRows}
          {templateConfigurations}

          {BlockTypeEnum.PIPELINE === block?.type && <div />}
        </Grid>
      </div>
    ),
    [badge, badgeRow, block, connectionRows, templateConfigurations, titleRow],
  );

  return (
    <GradientContainer
      // Only use gradient borders when block selected
      className={classNames?.join(' ')}
    >
      {main}
    </GradientContainer>
  );
}
