import PanelRows from '@mana/elements/PanelRows';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import {
  InteractionInputStyleInputTypeEnum,
  InteractionInputType, InteractionVariableType, InteractionInputTypeEnum
} from '@interfaces/InteractionType';
import TextInput from '@mana/elements/Input/TextInput';

export default function TemplateConfigurations({
  block,
  group,
  template,
  uuid,
}: {
  block: BlockType;
  group: PipelineExecutionFrameworkBlockType
  template: TemplateType;
  uuid: string;
}) {
  const {
    inputs,
    variables,
  } = group?.configuration?.templates?.[uuid] ?? {};
  const userValuesByVariable = block?.configuration?.templates?.[uuid]?.variables;

  return (
    <PanelRows padding={false}>
      <Grid padding={12} rowGap={4}>
        <Text semibold xsmall>
          {template?.name || uuid}
        </Text>
        {false && template?.description && (
          <Text secondary xsmall>
            {template?.description}
          </Text>
        )}
      </Grid >

      {Object.entries(variables ?? {})?.map(([variableUUID, variableConfig]: [string, InteractionVariableType], idx: number) => {
        const {
          description,
          input,
          name: displayName,
          required,
          types, // Data type; string, integer, etc
          value: defaultValue,
        } = variableConfig ?? {} as InteractionVariableType;
        const variableFromUser: { value: any } = userValuesByVariable?.[variableUUID] ?? null;
        const {
          // description,
          // label,
          options, // For dropdown menu
          // Monospace, multiline aka textarea, etc.
          // default
          // input_type
          // language
          // monospace
          // multiline
          // muted
          style,
          // What is this used for?
          // text,
          type: typeOfInput,
        } = inputs?.[input] ?? {} as InteractionInputType;

        const value = variableFromUser?.value ?? defaultValue ?? '';

        return (
          <label key={variableUUID}>
            <Grid
              alignItems="center"
              baseLeft
              baseRight
              columnGap={8}
              justifyContent="space-between"
              smallBottom
              smallTop
              style={{
                gridTemplateColumns: 'minmax(0px, max-content) auto',
              }}
            >
              <Text secondary small>
                {displayName || variableUUID || '-'}
              </Text>

              {InteractionInputTypeEnum.TEXT_FIELD === typeOfInput && (
                <TextInput
                  align="right"
                  basic
                  blendWithText
                  defaultValue={value}
                  italicPlaceholder
                  number={InteractionInputStyleInputTypeEnum.NUMBER === style?.input_type}
                  monospace={style.monospace}
                  placeholder={types?.filter(Boolean)?.join(', ')}
                  required={required}
                  small
                />
              )}
            </Grid>
          </label  >
        );
      })}
    </PanelRows >
  );
}
