import PanelRows from '@mana/elements/PanelRows';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';

export default function TemplateConfigurations({ template }: {
  template: {
    uuid: string;
    variables: Record<string, boolean | number | string>;
  };
}) {
  return (
    <PanelRows>
      {Object.entries(template?.variables)?.map((connection, idx: number) =>
        <Grid
          // key={`${connection?.fromItem?.uuid}-${connection?.toItem?.uuid}-${idx}`}
        />,
      )}
    </PanelRows>
  );
}
