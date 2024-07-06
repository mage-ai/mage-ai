import Circle from '@mana/elements/Circle';
import { getModeColorName } from '../presentation';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import PanelRows from '@mana/elements/PanelRows';
import Text from '@mana/elements/Text';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { useContext, useMemo } from 'react';
import { pluralize } from '@utils/string';
import { getBlockColor } from '@mana/themes/blocks';
import { groupBy, sortByKey, sum } from '@utils/array';

type BlockOverviewProps = {
  block: FrameworkType;
};

export default function BlockGroupOverview({
  block,
}: BlockOverviewProps) {
  const { configuration, description, uuid } = block;
  const { blocksByGroupRef } = useContext(ModelContext);
  const groups = 'children' in (block ?? {}) ? (block as { children: any[] }).children : [];

  const templatesForGroup = useMemo(() => (configuration as any)?.templates ?? {}, [configuration]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blocks = useMemo(() => Object.values(blocksByGroupRef?.current?.[uuid] ?? {}) ?? [], [uuid]);

  const childBlocksMemo = useMemo(() => {
    const blocksWithCustomCode = [];
    const arr = [];
    blocks?.forEach((block2: PipelineExecutionFrameworkBlockType) => {
      const colorName = getBlockColor(block2?.type, { getColorName: true }).names;
      const name2 = block2?.name;
      const uuid2 = block2?.uuid;

      const error = false;
      const required = false;
      const valid = false;

      const templates = block2?.configuration?.templates ?? {};
      const templatesHydrated = Object.entries(templates ?? {}).map(([templateUUID, { variables }]) => {
        const {
          name: templateName,
          variables: templateVars,
        } = templatesForGroup[templateUUID] ?? {};

        const vars = Object.entries(templateVars ?? {}).map(([varUUID, varConf]) => {
          const required = (varConf as any)?.required;
          const value = variables[varUUID] ?? varConf[varUUID];
          const valid = !required || value !== undefined;
          return {
            description: (varConf as any)?.description,
            name: (varConf as any)?.name,
            required,
            uuid: varUUID,
            valid,
            value,
          };
        });
        const invalid = vars?.filter(({ valid }) => !valid)?.length ?? 0;
        const required = vars?.filter(({ required }) => required)?.length ?? 0;

        return {
          block: block2,
          invalid,
          name: templateName,
          required,
          uuid: templateUUID,
          variables: vars,
        }
      });

      if (templatesHydrated?.length >= 1) {
        arr.push(...templatesHydrated);
      } else {
        blocksWithCustomCode.push(block2);
      }
    });

    const grouped = Object.entries(groupBy(arr, ({ name }) => name) ?? {});
    const sorted = sortByKey(grouped, ([k, v]) => sum(v.map(({ invalid }) => invalid)));

    return sorted?.map(([templateName, blocks2]) => (
      <>
        <Grid
          rowGap={8}
        >
          <Text secondary xsmall>
            {templateName}
          </Text  >

          <PanelRows padding={false}>
            {sortByKey(blocks2, ({ invalid }) => invalid)?.map(({
              block: block3,
              invalid,
              name: name3,
              uuid: uuid3,
            }) => {
              const error = invalid >= 1;
              const valid = !error;

              return (
                <GradientContainer
                  key={uuid3}
                // variant={!valid ? 'error' : undefined}
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
                      templateColumns="auto"
                      templateRows="1fr"
                    >

                      <Text medium secondary={!valid} small>
                        {block3?.name ?? block3?.uuid}
                      </Text>
                    </Grid>

                    <Grid
                      alignItems="center"
                      columnGap={8}
                      justifyItems="end"
                      templateColumns="auto"
                      templateRows="1fr"
                    >
                      {valid ?
                        (
                          <Circle
                            backgroundColor={valid ? 'green' : undefined}
                            borderColor={valid ? undefined : (error ? 'red' : 'gray')}
                            size={12}
                          />
                        )
                        : (
                          <Text medium secondary small>
                            Missing {pluralize('variable', invalid)}
                          </Text >
                        )}
                    </Grid>
                  </Grid>
                </GradientContainer>
              );
            })}
          </PanelRows>
        </Grid>
      </>
    ));


  }, [blocks, templatesForGroup])

  if (blocks?.length >= 1) {
    return (
      <Grid rowGap={12}>
        {childBlocksMemo}
      </Grid >
    );
  }

  if (!blocks?.length && !groups?.length) {
    return (
      <PanelRows padding={false}>
        <Grid
          alignItems="center"
          padding={16}
          templateColumns="1fr"
          templateRows="1fr"
          style={{
            maxWidth: 400,
          }}
        >
          <Text secondary small>
            {description}
          </Text>
        </Grid>
      </PanelRows>
    );
  }

  return (
    <PanelRows padding={false}>
      {groups?.map((group: FrameworkType) => {
        const {
          name,
          uuid: uuid2,
        } = group;
        const required = 'configuration' in group
          ? ((group as any)?.configuration?.metadata?.required ?? false)
          : 'children' in group && (group as any)?.children?.some(
            (child: PipelineExecutionFrameworkBlockType) =>
              child?.configuration?.metadata?.required);

        const getBlocks =
          (uuid3: string) => (Object.values(blocksByGroupRef?.current?.[uuid3] ?? {}) ?? []);
        const blocks = [
          ...getBlocks(uuid2),
          ...((group as any)?.children ?? [])?.flatMap(g => getBlocks(g.uuid)),
        ];
        const valid = blocks?.length >= 1;
        const error = required && !valid;
        const colorName = getModeColorName(blocks);

        return (
          <GradientContainer
            key={uuid2}
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
                  {name ?? uuid2}
                </Text>
              </Grid>
            </Grid>
          </GradientContainer  >
        );
      })}
    </PanelRows  >
  );
}
