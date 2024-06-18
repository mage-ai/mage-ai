import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import Badge from '@mana/elements/Badge';
import Circle from '@mana/elements/Circle';
import { ConnectionType, ConfigurationOptionType, BorderConfigType, TitleConfigType } from './types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { getBlockColor } from '@mana/themes/blocks';
import Aside from './Blocks/Aside';
import GradientContainer from '@mana/elements/Gradient';
import Connection from './Blocks/Connection';
import PanelRows from '@mana/elements/PanelRows';
import TemplateConfigurations from './Blocks/TemplateConfigurations';
import BlockType from '@interfaces/BlockType';
import { isEmptyObject } from '@utils/hash';

type BlockNodeProps = {
  block?: BlockType
  borderConfig?: BorderConfigType;
  collapsed?: boolean;
  connections?: ConnectionType[];
  configurationOptions?: ConfigurationOptionType[];
  titleConfig?: TitleConfigType;
};

export function BlockNode({
  block,
  borderConfig,
  connections,
  titleConfig,
}: BlockNodeProps) {
  const { borders } = borderConfig || {};
  const { asides, badge, inputConnection, outputConnection } = titleConfig || {};
  const { after, before } = asides || {};
  const { configuration } = block || {};

  const classNames = [
    styles.blockNode,
    borders?.length >= 2
      ? ''
      : borders?.length === 1
        ?  styles[`border-color-${borders?.[0]?.baseColorName?.toLowerCase()}`]
        : '',
  ];

  const main = (
    <div className={classNames.join(' ')}>
      <Grid
        rowGap={8}
        templateRows="auto"
      >
        {badge && (
          <Grid
            alignItems="center"
            columnGap={8}
            templateColumns={[
              inputConnection ? 'auto' : '1fr',
              inputConnection ? '1fr' : '',
              outputConnection ? 'auto' : '',
            ].join(' ')}
            templateRows="1fr"
          >
            {inputConnection && (
              <Circle
                backgroundColor={getBlockColor(
                  inputConnection?.fromItem?.type, { getColorName: true },
                )?.names?.base || 'gray'}
                size={12}
              />
            )}
            {badge && <Badge {...badge} />}
            {outputConnection && (
              <Circle
              backgroundColor={getBlockColor(
                outputConnection?.toItem?.type, { getColorName: true },
              )?.names?.base || 'gray'}
                size={12}
              />
            )}
          </Grid>
        )}

        {!badge && (
          <>
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

            {connections?.length >= 1 && (
              <PanelRows>
                {connections?.map((connection, idx: number) =>
                  <Connection
                    block={block}
                    connection={connection}
                    key={`${connection?.fromItem?.uuid}-${connection?.toItem?.uuid}-${idx}`}
                  />,
                )}
              </PanelRows>
            )}

            {!isEmptyObject(configuration?.templates)
              && Object.entries(configuration?.templates || {})?.map(([uuid, template]) => (
                <TemplateConfigurations key={uuid} template={{ ...template, uuid }} />
            ))}
          </>
        )}
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
