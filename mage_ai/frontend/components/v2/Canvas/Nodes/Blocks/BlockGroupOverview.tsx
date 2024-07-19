import Circle from '@mana/elements/Circle';
import BlockType from '@interfaces/BlockType';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { EventContext } from '../../../Apps/PipelineCanvas/Events/EventContext';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import PanelRows from '@mana/elements/PanelRows';
import Text from '@mana/elements/Text';
import {
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { LayoutDisplayEnum } from '../../types';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';
import { groupBy, sortByKey, sum } from '@utils/array';
import { groupValidation } from './utils';
import { pluralize } from '@utils/string';
import { useContext, useMemo } from 'react';

type BlockOverviewProps = {
  block: FrameworkType;
  buildContextMenuItemsForGroupBlock: (block: BlockType) => MenuItemType[];
  teleportIntoBlock: (event: any, target: any) => void;
};

export default function BlockGroupOverview({
  block,
  buildContextMenuItemsForGroupBlock,
  teleportIntoBlock,
}: BlockOverviewProps) {
  const { blockMappingRef, blocksByGroupRef, groupMappingRef } = useContext(ModelContext);
  const { layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const { handleContextMenu } = useContext(EventContext);
  const layoutConfig = layoutConfigs?.current?.[selectedGroupsRef?.current?.length - 1];
  const detailLayout = LayoutDisplayEnum.DETAILED === layoutConfig?.current?.display;

  const { configuration, description, uuid } = block;
  const groups = 'children' in (block ?? {}) ? (block as { children: any[] }).children : [];

  const templatesForGroup = useMemo(() => (configuration as any)?.templates ?? {}, [configuration]);
  const blocks = useMemo(
    () => Object.values(blocksByGroupRef?.current?.[uuid] ?? {}) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uuid],
  );

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
      const templatesHydrated = Object.entries(templates ?? {}).map(
        ([templateUUID, tpl]) => {
          const { name: templateName, variables: templateVars } =
            templatesForGroup[templateUUID] ?? {};

          const vars = Object.entries(templateVars ?? {}).map(([varUUID, varConf]) => {
            const required = (varConf as any)?.required;
            const value = (tpl as any)?.variables[varUUID] ?? varConf[varUUID];
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
          };
        },
      );

      if (templatesHydrated?.length >= 1) {
        arr.push(...templatesHydrated);
      } else {
        blocksWithCustomCode.push(block2);
      }
    });

    const grouped = Object.entries(groupBy(arr, ({ name }) => name) ?? {});
    const sorted = sortByKey(grouped, ([k, v]) => sum(v.map(({ invalid }) => invalid)));

    if (sorted.length === 0) {
      return null;
    }

    return sorted?.map(([templateName, blocks2]) => (
      <Grid key={templateName} rowGap={8}>
        <Text secondary xsmall>
          {templateName}
        </Text>

        <PanelRows padding={false}>
          {sortByKey(blocks2, ({ invalid }) => invalid)?.map(
            ({ block: block3, invalid, name: name3, uuid: uuid3 }) => {
              const error = invalid >= 1;
              const valid = !error;

              return (
                <GradientContainer key={uuid3} variant={error ? 'error-reverse' : undefined}>
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
                      {valid ? (
                        <Circle
                          backgroundColor={valid ? 'green' : undefined}
                          borderColor={valid ? undefined : error ? 'red' : 'gray'}
                          size={12}
                        />
                      ) : (
                        <Text medium secondary small>
                          Missing {pluralize('variable', invalid)}
                        </Text>
                      )}
                    </Grid>
                  </Grid>
                </GradientContainer>
              );
            },
          )}
        </PanelRows>
      </Grid>
    ));
  }, [blocks, templatesForGroup]);

  if (!blocks?.length && !groups?.length) {
    return (
      <Grid rowGap={8}>
        <PanelRows padding={false}>
          <Grid
            alignItems="center"
            padding={16}
            rowGap={8}
            style={{ maxWidth: 400 }}
            templateColumns="1fr"
            templateRows="1fr"
          >
            {configuration?.metadata?.required && (
              <Text italic secondary small>
                This operation is required.
              </Text>
            )}

            <Text secondary small>
              {description}
            </Text>
          </Grid>
        </PanelRows>
      </Grid>
    );
  }

  if (detailLayout) {
    return;
  }

  if (blocks?.length >= 1) {
    return (
      <Grid rowGap={12}>
        {childBlocksMemo}
        {!childBlocksMemo && (
          <PanelRows padding={false}>
            {/* <Grid justifyItems="start" padding={12} rowGap={4} templateColumns="auto" >
              <Text semibold xsmall>
                Custom code
              </Text>
            </Grid> */}
            {blocks?.map(block2 => (
              <Grid
                alignItems="stretch"
                baseLeft
                baseRight
                columnGap={8}
                justifyContent="space-between"
                key={(block2 as any).uuid}
                smallBottom
                smallTop
                style={{
                  gridTemplateColumns: 'minmax(0px, max-content) auto',
                }}
              >
                <Text secondary small>
                  {(block2 as any)?.name ?? (block2 as any)?.uuid}
                </Text>

                <Text secondary small>
                  {BLOCK_TYPE_NAME_MAPPING[(block2 as any)?.type ?? '']}
                </Text>
              </Grid>
            ))}
          </PanelRows>
        )}
      </Grid>
    );
  }

  return (
    <PanelRows padding={false}>
      {groups?.map((group1: FrameworkType) => {
        const group2 = groupMappingRef?.current?.[group1?.uuid];
        const { name, uuid: uuid2 } = group2;

        const errors = [];
        const requireds = [];
        const valids = [];
        const blocks2 = [];

        if (group2?.children?.length > 0) {
          group2?.children?.forEach(g3 => {
            const group3 = groupMappingRef?.current?.[g3.uuid];
            const stats = groupValidation(group3, blocksByGroupRef?.current);

            errors.push(stats.error);
            requireds.push(stats.required);
            valids.push(stats.valid);

            const blocks3 = Object.values(blocksByGroupRef?.current?.[group3?.uuid] ?? {});
            blocks2.push(...blocks3);

            const gblock = blockMappingRef?.current?.[group3?.uuid];

            // console.log(group1.uuid, group2.uuid, group3.uuid, errors, requireds, valids, group3, gblock, blocks3);
          });
        } else {
          const stats = groupValidation(group2, blocksByGroupRef?.current);
          const blocks3 = Object.values(blocksByGroupRef?.current?.[group2?.uuid] ?? {});
          blocks2.push(...blocks3);

          errors.push(stats.error);
          requireds.push(stats.required);
          valids.push(stats.valid);
        }

        const error = errors?.some(Boolean);
        const required = requireds?.some(Boolean);
        const valid = blocks2?.length > 0 && (!required || !error);

        // console.log(group1.uuid, group2.uuid, error, requireds, valids);

        const colorName = getModeColorName(blocks2);
        const rcount = requireds?.filter(Boolean)?.length ?? 0;
        const vcount = valids?.filter(Boolean)?.length ?? 0;

        return (
          <GradientContainer
            key={uuid2}
            onContextMenu={(event: any) => {
              event.preventDefault();
              event.stopPropagation();
              handleContextMenu(event, buildContextMenuItemsForGroupBlock(group1));
            }}
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
                  borderColor={valid ? undefined : error ? 'red' : 'gray'}
                  size={12}
                />

                <Text
                  italic={!required && (blocks?.length ?? 0) === 0 && (blocks2?.length ?? 0) === 0}
                  medium
                  secondary
                  small
                >
                  {blocks?.length >= 1
                    ? pluralize('block', blocks?.length ?? 0)
                    : blocks2?.length > 0
                      ? pluralize('block', blocks2?.length ?? 0)
                      : // `${vcount}/${rcount}`
                        required
                        ? 'Required'
                        : 'Optional'}
                </Text>
              </Grid>

              <Grid
                alignItems="center"
                columnGap={8}
                justifyItems="end"
                templateColumns="auto"
                templateRows="1fr"
              >
                <Link
                  medium
                  onClick={event => teleportIntoBlock(event, group2)}
                  preventDefault
                  secondary={!valid}
                  small
                  wrap
                >
                  {name ?? uuid2}
                </Link>
              </Grid>
            </Grid>
          </GradientContainer>
        );
      })}
    </PanelRows>
  );
}
