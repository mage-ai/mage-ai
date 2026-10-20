import PanelRows from '@mana/elements/PanelRows';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import BlockType, { TemplateType } from '@interfaces/BlockType';

export default function TemplateConfigurations({
  block,
  group,
  template,
  uuid,
}: {
  block: BlockType;
  group: BlockType;
  template: TemplateType;
  uuid: string;
}) {
  const templateSettings = block?.configuration?.templates?.[uuid] || ({} as TemplateType);

  return (
    <PanelRows>
      <Grid rowGap={4}>
        <Text semibold xsmall>
          {template?.name || uuid}
        </Text>
        {false && template?.description && (
          <Text secondary xsmall>
            {template?.description}
          </Text>
        )}
      </Grid>

      {Object.entries(template?.variables || [])?.map(([variableUUID, config], idx: number) => (
        <Grid
          columnGap={8}
          justifyContent="space-between"
          key={variableUUID}
          templateColumnsAutoFitMaxContent
        >
          <Text muted small>
            {variableUUID || '-'}
          </Text>

          <Text small>{templateSettings?.variables?.[variableUUID] ?? '-'}</Text>
        </Grid>
      ))}
    </PanelRows>
  );
}
