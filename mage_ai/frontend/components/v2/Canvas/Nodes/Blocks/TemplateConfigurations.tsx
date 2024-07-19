import PanelRows from '@mana/elements/PanelRows';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import { SharedBlockProps } from '../types';
import Loading from '@mana/components/Loading';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import {
  InteractionVariableTypeEnum,
  InteractionInputStyleInputTypeEnum,
  InteractionInputType,
  InteractionVariableType,
  InteractionInputTypeEnum,
} from '@interfaces/InteractionType';
import TextInput from '@mana/elements/Input/TextInput';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';

export default function TemplateConfigurations({
  block,
  group,
  template,
  teleportIntoBlock,
  updateBlock,
  uuid,
}: {
  group: PipelineExecutionFrameworkBlockType;
  template: TemplateType;
  teleportIntoBlock: (event: any, target: any) => void;
  uuid: string;
} & SharedBlockProps) {
  const { inputs, variables } = group?.configuration?.templates?.[uuid] ?? {};
  const userValuesByVariable = block?.configuration?.templates?.[uuid]?.variables;

  return (
    <PanelRows padding={false}>
      <Grid justifyItems="start" padding={12} rowGap={4} templateColumns="auto">
        <TooltipWrapper
          align={TooltipAlign.END}
          justify={TooltipJustify.END}
          tooltip={
            <Grid rowGap={8}>
              <Text semibold small>
                {template?.name || uuid}
              </Text>
              {template?.description && (
                <Text secondary small>
                  {template?.description}
                </Text>
              )}
            </Grid>
          }
          tooltipStyle={{ maxWidth: 400 }}
        >
          <Text semibold xsmall>
            {template?.name || uuid}
          </Text>
        </TooltipWrapper>
      </Grid>

      {Object.entries(variables ?? {})?.map(
        ([variableUUID, variableConfig]: [string, InteractionVariableType]) => {
          const {
            description,
            input,
            name: displayName,
            required,
            types, // Data type; string, integer, etc
            value: defaultValue,
          } = variableConfig ?? ({} as InteractionVariableType);
          const variableFromUser = userValuesByVariable?.[variableUUID] ?? null;
          const {
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
          } = inputs?.[input] ?? ({} as InteractionInputType);

          const value = variableFromUser ?? defaultValue ?? '';

          return (
            <label key={variableUUID}>
              <Grid
                alignItems="stretch"
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
                <TooltipWrapper
                  align={TooltipAlign.END}
                  horizontalDirection={TooltipDirection.LEFT}
                  style={{ alignContent: 'center', justifySelf: 'stretch', maxWidth: 300 }}
                  tooltip={
                    <Text secondary xsmall>
                      {description}
                    </Text>
                  }
                >
                  <Text secondary small>
                    {displayName || variableUUID || '-'}
                  </Text>
                </TooltipWrapper>

                {InteractionInputTypeEnum.TEXT_FIELD === typeOfInput && (
                  <TextInput
                    align="right"
                    autoComplete="off"
                    basic
                    blendWithText
                    defaultValue={value}
                    id={[block?.uuid, uuid, variableUUID]?.filter(Boolean).join('-')}
                    italicPlaceholder
                    monospace={style.monospace}
                    name={variableUUID}
                    number={
                      InteractionInputStyleInputTypeEnum.NUMBER === style?.input_type ||
                      [InteractionVariableTypeEnum.FLOAT, InteractionVariableTypeEnum.INTEGER].some(
                        varType => types?.includes(varType),
                      )
                    }
                    onChange={event =>
                      updateBlock(
                        event as any,
                        `configuration.templates.${uuid}.variables.${variableUUID}`,
                        event?.target?.value,
                      )
                    }
                    onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                      // Need to do this because the Canvas is swallowing the click event.
                      event.preventDefault();
                      event.stopPropagation();
                      (event.target as HTMLInputElement).focus();
                    }}
                    placeholder={types?.filter(Boolean)?.join(', ')}
                    required={required}
                    small
                  />
                )}
              </Grid>
            </label>
          );
        },
      )}
    </PanelRows>
  );
}
