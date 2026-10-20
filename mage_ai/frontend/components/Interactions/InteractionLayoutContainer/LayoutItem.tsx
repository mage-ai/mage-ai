import InteractionDisplay from '../InteractionDisplay';
import Spacing from '@oracle/elements/Spacing';
import { ArrowsAdjustingFrameSquare } from '@oracle/icons';
import { ContainerStyle, LayoutItemStyle } from '../index.style';
import {
  InteractionInputType,
  InteractionLayoutItemType,
  InteractionVariableType,
} from '@interfaces/InteractionType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export type LayoutItemProps = {
  columnLayoutSettings?: InteractionLayoutItemType;
  drag?: any;
  drop?: any;
  input?: InteractionInputType;
  setVariables?: (prev: any) => void;
  showVariableUUID?: boolean;
  variable?: InteractionVariableType;
  variables?: {
    [key: string]: any;
  };
  width?: number;
};

function LayoutItem({
  columnLayoutSettings,
  drag,
  drop,
  input,
  setVariables,
  showVariableUUID,
  variable,
  variables,
  width,
}: LayoutItemProps) {
  const inputUUID = variable?.input;
  const variableUUID = columnLayoutSettings?.variable;

  return (
    <LayoutItemStyle
      disableDrag={!drag}
      ref={drop}
      style={{ width }}
    >
      <ContainerStyle
        ref={drag}
        style={{ marginLeft: UNIT, marginRight: UNIT }}
      >
        <Spacing p={PADDING_UNITS}>
          {!!drag && (
            <Spacing mb={1}>
              <ArrowsAdjustingFrameSquare default size={2 * UNIT} />
            </Spacing>
          )}

          <InteractionDisplay
            interaction={{
              inputs: {
                [inputUUID]: input,
              },
              layout: [
                [
                  {
                    variable: variableUUID,
                    width: 1,
                  },
                ],
              ],
              variables: {
                [variableUUID]: variable,
              },
            }}
            setVariables={setVariables}
            showVariableUUID={showVariableUUID}
            variables={variables}
          />
        </Spacing>
      </ContainerStyle>
    </LayoutItemStyle>
  );
}

export default LayoutItem;
