import Circle from '@mana/elements/Circle';
import { getModeColorName } from '../presentation';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import PanelRows from '@mana/elements/PanelRows';
import Text from '@mana/elements/Text';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { useContext } from 'react';
import { pluralize } from '@utils/string';

type BlockOverviewProps = {
  block: FrameworkType;
};

export default function BlockGroupOverview({
  block,
}: BlockOverviewProps) {
  const { blocksByGroupRef } = useContext(ModelContext);
  const groups = 'children' in (block ?? {}) ? (block as { children: any[] }).children : [];

  return (
    <PanelRows padding={false}>
      {groups?.map((group: FrameworkType) => {
        const {
          name,
          uuid,
        } = group;
        const required = 'configuration' in group
          ? ((group as any)?.configuration?.metadata?.required ?? false)
          : 'children' in group && (group as any)?.children?.some(
            (child: PipelineExecutionFrameworkBlockType) =>
              child?.configuration?.metadata?.required);

        const getBlocks =
          (uuid2: string) => (Object.values(blocksByGroupRef?.current?.[uuid2] ?? {}) ?? []);
        const blocks = [
          ...getBlocks(uuid),
          ...((group as any)?.children ?? [])?.flatMap(g => getBlocks(g.uuid)),
        ];
        const valid = blocks?.length >= 1;
        const error = required && !valid;
        const colorName = getModeColorName(blocks);

        return (
          <GradientContainer
            key={uuid}
            variant={error ? 'error' : undefined}
          >
            <Grid
              alignItems="center"
              columnGap={8}
              padding={12}
              templateColumns="1fr 1fr"
              templateRows="1fr"
            >
              <Grid
                alignItems="center"
                columnGap={8}
                justifyItems="start"
                templateColumns="auto 1fr"
                templateRows="1fr"
              >
                <Circle
                  backgroundColor={valid ? colorName?.base : undefined}
                  borderColor={valid ? undefined : (error ? 'red' : 'gray')}
                  size={12}
                />

                <Text italic={!required} medium secondary small>
                  {blocks?.length >= 1
                    ? pluralize('block', blocks?.length ?? 0)
                    : (required ? 'Required' : 'Optional')}
                </Text >
              </Grid>

              <Grid
                alignItems="center"
                columnGap={8}
                justifyItems="end"
                templateColumns="auto"
                templateRows="1fr"
              >
                <Text medium secondary={!valid} small>
                  {name ?? uuid}
                </Text>
              </Grid>
            </Grid>
          </GradientContainer  >
        );
      })}
    </PanelRows  >
  );
}
