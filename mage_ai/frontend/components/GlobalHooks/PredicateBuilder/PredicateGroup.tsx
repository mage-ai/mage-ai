import { useEffect, useMemo,useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import LeftRightForm from './LeftRightForm';
import Panel from '@oracle/components/Panel';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close, Edit, Trash } from '@oracle/icons';
import {
  HookPredicateType,
  OPERATOR_LABEL_MAPPING,
  OPERATORS_WITHOUT_RIGHT,
  PredicateAndOrOperatorEnum,
  PredicateObjectTypeEnum,
  PredicateOperatorEnum,
  PredicateValueDataTypeEnum,
} from '@interfaces/GlobalHookType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { CircleStyle, LabelStyle, OperatorStyle, VerticalLineStyle } from './index.style';

type PredicateGroupProps = {
  andOrOperator?: PredicateAndOrOperatorEnum;
  children?: any;
  first?: boolean;
  last?: boolean;
  level: number;
  predicate: HookPredicateType;
  removePredicate: () => void;
  title: string;
  updatePredicate: (predicate: HookPredicateType) => void;
};

function PredicateGroup({
  andOrOperator: andOrOperatorParent,
  children,
  first,
  last,
  level,
  predicate,
  removePredicate,
  title,
  updatePredicate,
}: PredicateGroupProps) {
  const refForm = useRef(null);

  const [leftObjectTypeState, setLeftObjectTypeState] =
    useState<PredicateObjectTypeEnum | string>(null);
  const [leftKey, setLeftKey] = useState<string>(null);

  const [rightObjectTypeState, setRightObjectTypeState] =
    useState<PredicateObjectTypeEnum | string>(null);
  const [rightKey, setRightKey] = useState<string>(null);

  const [formHeight, setFormHeight] = useState(null);

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

  useEffect(() => {
    setFormHeight(refForm?.current?.getBoundingClientRect()?.height);
  }, []);

  useEffect(() => {
    setFormHeight(refForm?.current?.getBoundingClientRect()?.height);
  }, [
    leftObjectType,
    rightObjectType,
  ]);

  const andOrOperatorMemo = useMemo(() => {
    if (!andOrOperatorParent) {
      return null;
    }

    const el = (
      <Text bold center monospace uppercase>
        {andOrOperatorParent}
      </Text>
    );

    return (
      <OperatorStyle default={PredicateAndOrOperatorEnum.OR === andOrOperatorParent}>
        {el}
      </OperatorStyle>
    );
  }, [
    andOrOperatorParent,
    level,
  ]);

  return (
    <FlexContainer>
      <FlexContainer alignItems="flex-end" flexDirection="column">
        {!first && last && (
          <VerticalLineStyle
            default={PredicateAndOrOperatorEnum.OR === andOrOperatorParent}
            last
          />
        )}

        <LabelStyle>
          <FlexContainer alignItems="center">
            <Text monospace>
              {title}
            </Text>

            <Spacing mr={1} />

            <CircleStyle default={PredicateAndOrOperatorEnum.OR === andOrOperatorParent} />
          </FlexContainer>
        </LabelStyle>

        {!last && (
          <>
            <VerticalLineStyle default={PredicateAndOrOperatorEnum.OR === andOrOperatorParent} />

            {andOrOperatorMemo}

            <VerticalLineStyle default={PredicateAndOrOperatorEnum.OR === andOrOperatorParent} />
          </>
        )}

      </FlexContainer>

      <Spacing mr={PADDING_UNITS} />

      <Flex flex={1}>
        <FlexContainer flexDirection="column" fullWidth ref={refForm}>
          <Panel dark={!!(level % 2)}>
            <FlexContainer>
              <Flex flex={1} flexDirection="column">
                <FlexContainer justifyContent="center">
                  <FlexContainer
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    {!leftObjectType && typeof leftValue === 'undefined' && (
                      <Text monospace muted small>
                        Left expression
                      </Text>
                    )}

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
                        {!rightObjectType && typeof rightValue === 'undefined' && (
                          <Text monospace muted small>
                            Right expression
                          </Text>
                        )}

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
              </Flex>

              <div>
                <Button
                  beforeIcon={<Trash muted size={1.25 * UNIT} />}
                  compact
                  onClick={() => removePredicate()}
                  small
                >
                  <Text default monospace small>
                    Delete {title}
                  </Text>
                </Button>
              </div>
            </FlexContainer>

            {children}
          </Panel>

          {!last && <Spacing mb={PADDING_UNITS} />}
        </FlexContainer>
      </Flex>
    </FlexContainer>
  );
}

export default PredicateGroup;
