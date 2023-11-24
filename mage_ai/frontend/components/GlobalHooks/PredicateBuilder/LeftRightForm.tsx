import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { Add, Close, Trash } from '@oracle/icons';
import {
  HookPredicateType,
  PredicateAndOrOperatorEnum,
  PredicateObjectTypeEnum,
  PredicateValueDataTypeEnum,
} from '@interfaces/GlobalHookType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

const CUSTOM_VALUE_TYPE = 'CUSTOM_VALUE_TYPE';
const SHARED_INPUT_PROPS = {
  compact: true,
  small: true,
};

type LeftRightFormProps = {
  rightAligned?: boolean;
};

function LeftRightForm({
  leftKey,
  leftObjectKeys,
  leftObjectType,
  leftObjectTypeState,
  leftValue,
  leftValueType,
  rightAligned,
  setLeftKey,
  setLeftObjectTypeState,
  updatePredicate,
}: LeftRightFormProps) {
  const buttonRef = useRef(null);

  const [buttonAfterWidth, setButtonAfterWidth] = useState();
  useEffect(() => {
    setButtonAfterWidth(buttonRef?.current?.getBoundingClientRect()?.width);
  }, []);

  const sharedFlexContainerProps = useMemo(() => ({
    alignItems: 'center',
    justifyContent: rightAligned ? 'flex-start' : 'flex-end',
  }), [rightAligned]);

  const dataTypeMemo = useMemo(() => {
    const el1 = <Text default small>Data type of value</Text>;
    const el2 = (
      <Select
        compact
        onChange={e => updatePredicate({
          [rightAligned ? 'right_value_type' : 'left_value_type']: {
            ...leftValueType,
            value_data_type: e.target.value,
          },
        })}
        placeholder="required"
        small
        value={leftValueType?.value_data_type}
      >
        {Object.values(PredicateValueDataTypeEnum).map((valueDataType: string) => (
          <option key={valueDataType} value={valueDataType}>
            {capitalizeRemoveUnderscoreLower(valueDataType)}
          </option>
        ))}
      </Select>
    );

    return (
      <FlexContainer {...sharedFlexContainerProps}>
        {rightAligned ? el2 : el1}

        <Spacing mr={1} />

        {rightAligned ? el1 : el2}
      </FlexContainer>
    );
  }, [
    leftValueType,
    rightAligned,
    sharedFlexContainerProps,
    updatePredicate,
  ]);

  const objectTypeMemo = useMemo(() => {
    const el1 = (
      <Text default small>
        Get value from
      </Text>
    );

    const el2 = (
      <Select
        {...SHARED_INPUT_PROPS}
        onChange={(e) => {
          const value = e.target.value;
          setLeftObjectTypeState(value);

          if (CUSTOM_VALUE_TYPE === value) {
            updatePredicate({
              [rightAligned ? 'right_object_keys' : 'left_object_keys']: null,
              [rightAligned ? 'right_object_type' : 'left_object_type']: null,
            });
          } else {
            updatePredicate({
              [rightAligned ? 'right_object_type' : 'left_object_type']: value,
              [rightAligned ? 'right_value' : 'left_value']: null,
            });
          }
        }}
        placeholder="required"
        value={CUSTOM_VALUE_TYPE === leftObjectTypeState ? CUSTOM_VALUE_TYPE : leftObjectType}
      >
        <option value={CUSTOM_VALUE_TYPE}>
          Custom value
        </option>
        {Object.values(PredicateObjectTypeEnum).map((valueDataType: string) => (
          <option key={valueDataType} value={valueDataType}>
            {capitalizeRemoveUnderscoreLower(valueDataType)}
          </option>
        ))}
      </Select>
    );

    const el3 = CUSTOM_VALUE_TYPE === leftObjectTypeState && (
      <>
        {!rightAligned && <Spacing mr={1} />}

        <TextInput
          {...SHARED_INPUT_PROPS}
          onChange={e => updatePredicate({
            [rightAligned ? 'right_value' : 'left_value']: e.target.value,
          })}
          value={leftValue || ''}
        />

        {rightAligned && <Spacing mr={1} />}
      </>
    );

    return (
      <FlexContainer {...sharedFlexContainerProps}>
        {!rightAligned && el1}

        {rightAligned && el3}
        {rightAligned && el2}

        <Spacing mr={1} />

        {!rightAligned && el2}
        {!rightAligned && el3}

        {rightAligned && el1}
      </FlexContainer>
    );
  }, [
    leftObjectType,
    leftObjectTypeState,
    leftValue,
    setLeftObjectTypeState,
    sharedFlexContainerProps,
    updatePredicate,
  ]);

  const buttonEl = useMemo(() => (
    <>
      {rightAligned && <div style={{ paddingRight: 4 }} />}

      <Button
        compact
        disabled={!leftKey}
        onClick={() => {
          updatePredicate({
            [rightAligned ? 'right_object_keys' : 'left_object_keys']: (leftObjectKeys || []).concat(leftKey),
          });
          setLeftKey(null);
        }}
        padding="2px 6px"
        ref={buttonRef}
        small
      >
        Add key
      </Button>

      {!rightAligned && <div style={{ paddingRight: 4 }} />}
    </>
  ), [
    leftKey,
    leftObjectKeys,
    rightAligned,
    setLeftKey,
    updatePredicate,
  ]);

  const keysMemo = useMemo(() => {
    const el1 = (
      <Text default small>
        Value extraction keys
      </Text>
    );


    const el2 = (
      <TextInput
        {...SHARED_INPUT_PROPS}
        buttonAfter={!rightAligned && buttonEl}
        buttonAfterWidth={!rightAligned && buttonAfterWidth + 10}
        buttonBefore={rightAligned && buttonEl}
        buttonBeforeWidth={rightAligned && buttonAfterWidth + 10}
        onChange={e => {
          setLeftKey(e.target.value);
        }}
        placeholder="Enter key..."
        value={leftKey || ''}
      />
    );

    const el3 = (
      <>
      </>
    );

    const el4 = (
      <>
      </>
    );

    return (
      <>
        <FlexContainer {...sharedFlexContainerProps}>
          {rightAligned ? el2 : el1}

          <Spacing mr={1} />

          {rightAligned ? el1 : el2}
        </FlexContainer>

        {leftObjectKeys?.length >= 1 && (
          <Spacing mt={1}>
            <FlexContainer {...sharedFlexContainerProps}>
              <Text default monospace xsmall>
                {leftObjectType}
              </Text>{!leftObjectKeys?.length && (
                <Text monospace muted xsmall>
                  ['<Text default inline monospace xsmall>
                    ...
                  </Text>']
                </Text>
              )}{leftObjectKeys?.map((key: string) => (
                 <Text monospace muted xsmall>
                   ['<Text default inline monospace xsmall>
                     {key}
                   </Text>']
                 </Text>
              ))}

              <div style={{ marginRight: 4 }} />

              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => {
                  updatePredicate({
                    [rightAligned ? 'right_object_keys' : 'left_object_keys']: (leftObjectKeys || []).slice(
                      0,
                      Math.max(0, leftObjectKeys?.length - 1),
                    ),
                  });
                }}
              >
                <FlexContainer alignItems="center">
                  <Close danger size={UNIT * 1.25} />
                  <div style={{ marginRight: 2 }} />
                  <Text default xsmall>
                    Delete key
                  </Text>
                </FlexContainer>
              </Button>
            </FlexContainer>
          </Spacing>
        )}
      </>
    );
  }, [
    buttonAfterWidth,
    buttonEl,
    leftKey,
    leftObjectKeys,
    leftObjectType,
    rightAligned,
    sharedFlexContainerProps,
  ])

  return (
    <>
      {dataTypeMemo}

      <Spacing mt={1} />

      {objectTypeMemo}

      <Spacing mt={1} />

      {leftObjectType && CUSTOM_VALUE_TYPE !== leftObjectTypeState && keysMemo}
    </>
  );
}

export default LeftRightForm;
