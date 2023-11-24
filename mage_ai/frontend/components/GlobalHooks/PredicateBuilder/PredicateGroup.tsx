import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import LeftRightForm from './LeftRightForm';
import Panel from '@oracle/components/Panel';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import {
  HookPredicateType,
  OPERATOR_LABEL_MAPPING,
  OPERATORS_WITHOUT_RIGHT,
  PredicateObjectTypeEnum,
  PredicateOperatorEnum,
  PredicateValueDataTypeEnum,
} from '@interfaces/GlobalHookType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type PredicateGroupProps = {
  predicate: HookPredicateType;
  updatePredicate: (predicate: HookPredicateType) => void;
};

function PredicateGroup({
  predicate,
  updatePredicate,
}: PredicateGroupProps) {
  const [leftObjectTypeState, setLeftObjectTypeState] =
    useState<PredicateObjectTypeEnum | string>(null);
  const [leftKey, setLeftKey] = useState<string>(null);

  const [rightObjectTypeState, setRightObjectTypeState] =
    useState<PredicateObjectTypeEnum | string>(null);
  const [rightKey, setRightKey] = useState<string>(null);

  const {
    and_or_operator: andOrOperator,
    left_object_keys: leftObjectKeys,
    left_object_type: leftObjectType,
    left_value: leftValue,
    left_value_type: leftValueType,
    operator,
    right_object_keys: rightObjectKeys,
    right_object_type: rightObjectType,
    right_value: rightValue,
    right_value_type: rightValueType,
  } = predicate;

  return (
    <>
      <Panel>
        <FlexContainer justifyContent="center">
          <FlexContainer
            alignItems="center"
            justifyContent="flex-end"
          >
            {!leftObjectType && leftValue && (
              <Text default monospace small>
                {PredicateValueDataTypeEnum.STRING === leftValueType?.value_data_type ? `'${leftValue}'` : leftValue}
              </Text>
            )}
            {leftObjectType && (
              <>
                <Text default monospace small>
                  {leftObjectType}
                </Text>{!leftObjectKeys?.length && (
                  <Text monospace muted small>
                    ['<Text default inline monospace small>
                      ...
                    </Text>']
                  </Text>
                )}{leftObjectKeys?.map((key: string) => (
                   <Text monospace muted small>
                     ['<Text default inline monospace small>
                       {key}
                     </Text>']
                   </Text>
                ))}
              </>
            )}
          </FlexContainer>

          <Spacing mr={1} />

          <Text default monospace small>
            {operator ? OPERATOR_LABEL_MAPPING[operator] : 'operator'}
          </Text>

          {(!operator || !OPERATORS_WITHOUT_RIGHT.includes(operator)) && (
            <>
              <Spacing mr={1} />

              <FlexContainer
                alignItems="center"
                justifyContent="flex-start"
              >
                {!rightObjectType && rightValue && (
                  <Text default monospace small>
                    {PredicateValueDataTypeEnum.STRING === rightValueType?.value_data_type ? `'${rightValue}'` : rightValue}
                  </Text>
                )}
                {rightObjectType && (
                  <>
                    <Text default monospace small>
                      {rightObjectType}
                    </Text>{!rightObjectKeys?.length && (
                      <Text monospace muted small>
                        ['<Text default inline monospace small>
                          ...
                        </Text>']
                      </Text>
                    )}{rightObjectKeys?.map((key: string) => (
                       <Text monospace muted small>
                         ['<Text default inline monospace small>
                           {key}
                         </Text>']
                       </Text>
                    ))}
                  </>
                )}
              </FlexContainer>
            </>
          )}
        </FlexContainer>

        <Spacing mb={PADDING_UNITS} />

        <FlexContainer alignItems="center">
          <Flex flex={1} flexDirection="column">
            <LeftRightForm
              leftKey={leftKey}
              leftObjectKeys={leftObjectKeys}
              leftObjectType={leftObjectType}
              leftObjectTypeState={leftObjectTypeState}
              leftValue={leftValue}
              leftValueType={leftValueType}
              setLeftKey={setLeftKey}
              setLeftObjectTypeState={setLeftObjectTypeState}
              updatePredicate={updatePredicate}
            />
          </Flex>

          <Spacing mr={PADDING_UNITS} />

          <div>
            <Select
              alignCenter
              compact
              onChange={e => updatePredicate({
                operator: e.target.value,
              })}
              placeholder="required"
              small
              value={operator}
            >
              {Object.values(PredicateOperatorEnum).map((value: string) => (
                <option key={value} value={value}>
                  {OPERATOR_LABEL_MAPPING[value]}
                </option>
              ))}
            </Select>
          </div>

          <Spacing mr={PADDING_UNITS} />

          <Flex flex={1} flexDirection="column">
            <LeftRightForm
              leftKey={rightKey}
              leftObjectKeys={rightObjectKeys}
              leftObjectType={rightObjectType}
              leftObjectTypeState={rightObjectTypeState}
              leftValue={rightValue}
              leftValueType={rightValueType}
              rightAligned
              setLeftKey={setRightKey}
              setLeftObjectTypeState={setRightObjectTypeState}
              updatePredicate={updatePredicate}
            />
          </Flex>
        </FlexContainer>
      </Panel>
    </>
  );
}

export default PredicateGroup;
