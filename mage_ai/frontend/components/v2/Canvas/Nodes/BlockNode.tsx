import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import Badge from '@mana/elements/Badge';
import Circle from '@mana/elements/Circle';
import { ConfigurationOptionType, BorderConfigType, TitleConfigType } from './types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { getBlockColor } from '@mana/themes/blocks';
import Aside from './Blocks/Aside';
import { DragItem, PortType } from '../interfaces';
import GradientContainer from '@mana/elements/Gradient';
import Connection from './Blocks/Connection';
import PanelRows from '@mana/elements/PanelRows';
import TemplateConfigurations from './Blocks/TemplateConfigurations';
import BlockType from '@interfaces/BlockType';
import { isEmptyObject } from '@utils/hash';
import { useMemo } from 'react';
import { buildPortUUID } from '../Draggable/utils';
import { ItemTypeEnum, PortSubtypeEnum } from '../types';
import { DragAndDropHandlersType } from './types';

type BlockNodeProps = {
  block?: BlockType
  borderConfig?: BorderConfigType;
  item: DragItem;
  collapsed?: boolean;
  configurationOptions?: ConfigurationOptionType[];
  groups?: Record<string, BlockType>;
  onMount?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  titleConfig?: TitleConfigType;
};

export function BlockNode({
  block,
  borderConfig,
  groups,
  item,
  onMount,
  titleConfig,
  handlers,
}: BlockNodeProps & DragAndDropHandlersType) {
  const { borders } = borderConfig || {};
  const { asides, badge } = titleConfig || {};
  const { after, before } = asides || {};
  const { inputs, outputs } = item || {};

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
    styles.blockNode,
    borders?.length >= 2
      ? ''
      : borders?.length === 1
        ?  styles[`border-color-${borders?.[0]?.baseColorName?.toLowerCase()}`]
        : '',
  ];

  const badgeRow = useMemo(() => badge && (
    <Grid
      alignItems="center"
      columnGap={8}
      templateColumns={[
        inputs?.length >= 1 ? 'auto' : '1fr',
        inputs?.length >= 1 ? '1fr' : '',
        outputs?.length >= 1 ? 'auto' : '',
      ].join(' ')}
      templateRows="1fr"
    >
      {inputs?.length >= 1 && (
        <Circle
          backgroundColor={getBlockColor(
            inputs?.[0]?.target?.block?.type, { getColorName: true },
          )?.names?.base || 'gray'}
          size={12}
        />
      )}
      {badge && <Badge {...badge} />}
      {outputs?.length >= 1 && (
        <Circle
          backgroundColor={getBlockColor(
            outputs?.[0]?.target?.block?.type, { getColorName: true },
          )?.names?.base || 'gray'}
            size={12}
        />
      )}
    </Grid>
  ), [badge, inputs, outputs]);

  const connectionRows = useMemo(() => inputOutputPairs?.length >= 1 && (
    <PanelRows>
      {inputOutputPairs?.map(({
        input,
        output,
      }, idx: number) =>
        <Connection
          handlers={handlers}
          input={input}
          key={[
            input ? buildPortUUID(input) : '',
            output ? buildPortUUID(output) : '',
          ].join(':')}
          onMount={onMount}
          output={output}
        />,
      )}
    </PanelRows>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [block, handlers, inputOutputPairs]);

  const templateConfigurations = useMemo(() => groups && Object.entries(groups)?.map(([groupUUID, group]) => !isEmptyObject(group?.configuration?.templates)
    && Object.entries(group?.configuration?.templates || {})?.map(([uuid, template]) => (
      <TemplateConfigurations
        block={block}
        group={group}
        key={uuid}
        template={template}
        uuid={uuid}
      />
  ))), [block, groups]);

  const titleRow = useMemo(() => (
    <Grid
      alignItems="center"
      columnGap={12}
      templateColumns={[
        before ? 'auto' : '1fr',
        (before || after) ? '1fr' : '',
        before && after ? 'auto' : '',
      ].join(' ')}
      templateRows="1fr"
    >
      {before && <Aside {...before} />}

      <Text semibold small>{titleConfig?.label}</Text>

      {after && <Aside {...after} />}
    </Grid>
  ), [after, before, titleConfig]);

  const main = (
    <div className={classNames.join(' ')}>
      <Grid
        rowGap={8}
        templateRows="auto"
      >
        {badgeRow}
        {!badge && titleRow}
        {connectionRows}
        {templateConfigurations}
      </Grid>
    </div>
  );

  if (borders?.length >= 1) {
    return (
      <GradientContainer
        borderColors={borders?.slice?.(0, 2)?.map(b => b.baseColorName)}
      >
        {main}
      </GradientContainer>
    );
  }

  return main;
}
