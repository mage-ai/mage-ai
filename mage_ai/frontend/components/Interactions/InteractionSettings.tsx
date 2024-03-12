import { useCallback, useMemo, useRef, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel, {
  ANIMATION_DURATION_CONTENT,
} from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InteractionDisplay from './InteractionDisplay';
import InteractionLayoutContainer from './InteractionLayoutContainer';
import InteractionType, {
  INTERACTION_INPUT_TYPES,
  INTERACTION_VARIABLE_VALUE_TYPES,
  InteractionInputOptionType,
  InteractionInputStyleInputTypeEnum,
  InteractionInputStyleType,
  InteractionInputType,
  InteractionInputTypeEnum,
  InteractionLayoutItemType,
  InteractionVariableType,
  InteractionVariableTypeEnum,
} from '@interfaces/InteractionType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Add, Close } from '@oracle/icons';
import { ContainerStyle, HeadlineStyle } from './index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower, removeUnderscore } from '@utils/string';
import { pauseEvent } from '@utils/events';
import { removeAtIndex } from '@utils/array';

type InteractionSettingsProps = {
  children?: any;
  containerWidth?: number;
  interaction: InteractionType;
  removeBlockInteraction?: () => void;
  updateInteraction: (interaction: InteractionType) => void;
};

function InteractionSettings({
  children,
  containerWidth,
  interaction,
  removeBlockInteraction,
  updateInteraction: updateInteractionProp,
}: InteractionSettingsProps) {
  const containerRef = useRef(null);
  const refMostRecentlyAddedInput = useRef(null);
  const refMostRecentlyAddedVariable = useRef(null);
  const refNewInputUUID = useRef(null);
  const refNewVariableUUID = useRef(null);

  const [isAddingNewVariable, setIsAddingNewVariable] = useState<boolean>(false);
  const [isAddingNewInput, setIsAddingNewInput] = useState<boolean>(false);
  const [mostRecentlyAddedInputUUID, setMostRecentlyAddedInputUUID] = useState<string>(null);
  const [mostRecentlyAddedVariableUUID, setMostRecentlyAddedVariableUUID] = useState<string>(null);
  const [mostRecentlyTouchedVariableUUID, setMostRecentlyTouchedVariableUUID] = useState<string>(null);
  const [newInputUUID, setNewInputUUID] = useState<string>(null);
  const [newVariableUUID, setNewVariableUUID] = useState<string>(null);
  const [visibleMappingForced, setVisibleMappingForced] = useState<{
    [index: string]: boolean;
  }>({});

  const {
    inputs,
    layout,
    uuid,
    variables,
  } = interaction || {
    layout: null,
    variables: null,
    uuid: null,
  };

  const updateInteraction = useCallback((data) => updateInteractionProp({
    ...interaction,
    ...data,
  }), [
    interaction,
    updateInteractionProp,
  ]);

  const updateInteractionInputs = useCallback((
    inputUUID: string,
    input: InteractionInputType,
  ) => {
    const variablesUpdated = {
      ...variables,
    };
    const inputsUpdated = {
      ...inputs,
    };

    const shouldDelete: boolean = !input;

    if (shouldDelete) {
      delete inputsUpdated[inputUUID];

      Object.entries(variablesUpdated || {}).forEach(([variableUUID, variable]) => {
        if (inputUUID === variable?.input) {
          variablesUpdated[variableUUID] = {
            ...variable,
            input: null,
          };
        }
      });
    } else {
      inputsUpdated[inputUUID] = {
        ...inputsUpdated?.[inputUUID],
        ...input,
      };
    }

    return updateInteraction({
      inputs: inputsUpdated,
    });
  }, [
    inputs,
    updateInteraction,
    variables,
  ]);

  const updateInteractionVariables = useCallback((
    variableUUID: string,
    variable: InteractionVariableType,
  ) => {
    const layoutUpdated = [];
    const variablesUpdated = {
      ...variables,
    };

    const shouldDelete: boolean = !variable;

    if (shouldDelete) {
      delete variablesUpdated[variableUUID];
    } else {
      variablesUpdated[variableUUID] = {
        ...variablesUpdated?.[variableUUID],
        ...variable,
      };
    }

    layout?.forEach((row) => {
      const arr = [];

      row?.forEach((layoutItem) => {
        if (!shouldDelete || variableUUID !== layoutItem?.variable) {
          arr.push(layoutItem);
        }
      });

      if (arr?.length >= 1) {
        layoutUpdated.push(arr);
      }
    });

    return updateInteraction({
      layout: layoutUpdated,
      variables: variablesUpdated,
    });
  }, [
    layout,
    updateInteraction,
    variables,
  ]);

  const inputsMemo = useMemo(() => Object.entries(inputs || {}).map(([
    inputUUID,
    input,
  ], idx: number) => {
    const {
      options,
      style,
      type: inputType,
    } = input || {
      options: [],
      style: null,
      type: null,
    };

    return (
      <Spacing key={`${inputUUID}-${idx}`} mt={idx >= 1 ? PADDING_UNITS : 0}>
        <ContainerStyle
          ref={mostRecentlyAddedInputUUID === inputUUID
            ? refMostRecentlyAddedInput
            : null
          }
        >
          <HeadlineStyle>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Text large monospace>
                  {inputUUID}
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Button
                  iconOnly
                  noBackground
                  noBorder
                  noPadding
                  onClick={() => updateInteractionInputs(inputUUID, null)}
                >
                  <Close default />
                </Button>
              </FlexContainer>
            </Spacing>
          </HeadlineStyle>

          <Divider muted />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer fullWidth>
              <Flex flex={1} flexDirection="column">
                <Spacing mb={1}>
                  <Text bold default>
                    Type
                  </Text>
                </Spacing>

                <Select
                  onChange={e => updateInteractionInputs(inputUUID, {
                    type: e.target.value,
                  })}
                  placeholder="Choose a type of input"
                  value={inputType}
                >
                  {INTERACTION_INPUT_TYPES.map((iType: string) => (
                    <option key={iType} value={iType}>
                      {capitalizeRemoveUnderscoreLower(iType)}
                    </option>
                  ))}
                </Select>
              </Flex>

              <Spacing mr={UNITS_BETWEEN_ITEMS_IN_SECTIONS} />

              <Flex flex={1} flexDirection="column">
                {InteractionInputTypeEnum.TEXT_FIELD === inputType && (
                  <>
                    <Spacing mb={PADDING_UNITS}>
                      <Spacing mb={1}>
                        <Text bold default>
                          Style {removeUnderscore(inputType)}
                        </Text>
                      </Spacing>

                      <Checkbox
                        checked={style?.multiline}
                        label="Allow writing multiple lines"
                        onClick={() => updateInteractionInputs(inputUUID, {
                          style: {
                            ...style,
                            multiline: !style?.multiline,
                          },
                        })}
                      />
                    </Spacing>

                    <div>
                      <Spacing mb={1}>
                        <Text bold default>
                          Text field type
                        </Text>
                        {style?.multiline && (
                          <Text muted small>
                            Not available for multiline text field.
                          </Text>
                        )}
                      </Spacing>

                      <Checkbox
                        checked={InteractionInputStyleInputTypeEnum.NUMBER === style?.input_type}
                        disabled={!!style?.multiline}
                        label="Numbers only"
                        onClick={() => updateInteractionInputs(inputUUID, {
                          style: {
                            ...style,
                            input_type: InteractionInputStyleInputTypeEnum.NUMBER === style?.input_type
                              ? null
                              : InteractionInputStyleInputTypeEnum.NUMBER,
                          },
                        })}
                      />
                    </div>
                  </>
                )}

                {[
                  InteractionInputTypeEnum.CHECKBOX,
                  InteractionInputTypeEnum.DROPDOWN_MENU,
                ].includes(inputType) && (
                  <>
                    <Spacing mb={1}>
                      <Text bold default>
                        Options for {removeUnderscore(inputType)}
                      </Text>
                    </Spacing>

                    {options?.map(({
                      label,
                      value,
                    }, idx: number) => (
                      <Spacing key={`${inputUUID}-option-${idx}`} mt={idx >= 1 ? 1 : 0}>
                        <FlexContainer
                          alignItems="center"
                          flexDirection="row"
                        >
                          <Button
                            iconOnly
                            noBackground
                            noBorder
                            onClick={() => updateInteractionInputs(inputUUID, {
                              options: removeAtIndex(options, idx),
                            })}
                          >
                            <Close />
                          </Button>

                          <Spacing mr={PADDING_UNITS} />

                          <Text default>
                            Label
                          </Text>

                          <Spacing mr={1} />

                          <TextInput
                            compact
                            onChange={e => updateInteractionInputs(inputUUID, {
                              options: (options || [])?.map((opt, idx2: number) => idx === idx2
                                ? { ...opt, label: e.target.value }
                                : opt
                              ),
                            })}
                            value={label || ''}
                          />

                          <Spacing mr={PADDING_UNITS} />

                          <Text default>
                            Value
                          </Text>

                          <Spacing mr={1} />

                          <TextInput
                            compact
                            onChange={e => updateInteractionInputs(inputUUID, {
                              options: (options || [])?.map((opt, idx2: number) => idx === idx2
                                ? { ...opt, value: e.target.value }
                                : opt
                              ),
                            })}
                            value={value || ''}
                          />
                        </FlexContainer>
                      </Spacing>
                    ))}

                    <Spacing mt={1}>
                      <Button
                        beforeIcon={<Add />}
                        compact
                        onClick={() => updateInteractionInputs(inputUUID, {
                          options: (options || []).concat({
                            label: '',
                            value: '',
                          }),
                        })}
                        secondary
                      >
                        Add option
                      </Button>
                    </Spacing>
                  </>
                )}
              </Flex>
            </FlexContainer>
          </Spacing>
        </ContainerStyle>
      </Spacing>
    );
  }), [
    inputs,
    mostRecentlyAddedInputUUID,
    refMostRecentlyAddedInput,
    updateInteractionInputs,
  ]);

  const variablesMemo = useMemo(() => Object.entries(variables || {}).map(([
    variableUUID,
    variable,
  ], idx: number) => {
    const {
      description,
      input: inputUUID,
      name,
      required,
      types,
    } = variable || {
      description: '',
      name: '',
      required: false,
      types: [],
    };

    const inputSettings = inputs?.[inputUUID];

    return (
      <Spacing key={`${variableUUID}-${idx}`} mt={idx >= 1 ? PADDING_UNITS : 0}>
        <ContainerStyle
          ref={mostRecentlyAddedVariableUUID === variableUUID
            ? refMostRecentlyAddedVariable
            : null
          }
        >
          <HeadlineStyle>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <FlexContainer alignItems="center" flexDirection="row">
                  <Text large monospace>
                    {variableUUID}
                  </Text>

                  <Spacing mr={PADDING_UNITS} />

                  <FlexContainer alignItems="center">
                    <ToggleSwitch
                      checked={required as boolean}
                      compact
                      onCheck={(valFunc: (val: boolean) => boolean) => updateInteractionVariables(
                        variableUUID,
                        {
                          required: valFunc(required),
                        },
                      )}
                    />

                    <Spacing mr={1} />

                    <Text muted={!required} success={required}>
                      Required
                    </Text>
                  </FlexContainer>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Button
                  iconOnly
                  noBackground
                  noBorder
                  noPadding
                  onClick={() => updateInteractionVariables(variableUUID, null)}
                >
                  <Close default />
                </Button>
              </FlexContainer>
            </Spacing>
          </HeadlineStyle>

          <Divider muted />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer fullWidth>
              <Flex flex={1} flexDirection="column">
                <Spacing mb={1}>
                  <Text bold default>
                    Label
                  </Text>
                </Spacing>

                <TextInput
                  onChange={e => updateInteractionVariables(variableUUID, {
                    name: e.target.value,
                  })}
                  value={name}
                />

                <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                  <Spacing mb={1}>
                    <Text bold default>
                      Valid data types
                    </Text>
                  </Spacing>

                  <FlexContainer
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {INTERACTION_VARIABLE_VALUE_TYPES.map((
                      variableValueType: InteractionVariableTypeEnum,
                    ) => {
                      const checked = types?.includes(variableValueType);

                      return (
                        <Spacing
                          key={variableValueType}
                          mr={PADDING_UNITS}
                        >
                          <Checkbox
                            checked={checked}
                            label={capitalizeRemoveUnderscoreLower(variableValueType)}
                            onClick={()  => updateInteractionVariables(variableUUID, {
                              types: checked
                                ? types?.filter(t => t !== variableValueType)
                                : (types || []).concat(variableValueType),
                            })}
                          />
                        </Spacing>
                      );
                    })}
                  </FlexContainer>
                </Spacing>
              </Flex>

              <Spacing mr={UNITS_BETWEEN_ITEMS_IN_SECTIONS} />

              <Flex flex={1} flexDirection="column">
                <Spacing mb={1}>
                  <Text bold default>
                    Description
                  </Text>
                </Spacing>

                <TextArea
                  onChange={e => updateInteractionVariables(variableUUID, {
                    description: e.target.value,
                  })}
                  rows={Math.max(3, description?.split('\n')?.length)}
                  value={description}
                />
              </Flex>
            </FlexContainer>

            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <FlexContainer
                alignContent="center"
                flexDirection="row"
                justifyContent="space-between"
              >
                <FlexContainer flexDirection="column">
                  <Text bold default>
                    Input
                  </Text>
                  <Text muted>
                    Associate an existing input to this variable or create a new input and
                    then associate it to this variable.
                  </Text>
                </FlexContainer>
              </FlexContainer>

              <Spacing mt={1}>
                <Select
                  monospace
                  onChange={(e) => {
                    const val = e.target.value;

                    if ('+ Add a new input' === val) {
                      setIsAddingNewInput(true);
                      setMostRecentlyTouchedVariableUUID(variableUUID);
                      setTimeout(() => refNewInputUUID?.current?.focus(), 1);
                    } else {
                      updateInteractionVariables(variableUUID, {
                        input: val,
                      });
                    }
                  }}
                  placeholder="Select an existing input"
                  value={inputUUID}
                >
                  <option value="" />
                  <option value="+ Add a new input">
                    + Add a new input
                  </option>
                  {Object.keys(inputs || {}).map((iUUID: string) => (
                    <option key={iUUID} value={iUUID}>
                      {iUUID}
                    </option>
                  ))}
                </Select>
              </Spacing>
            </Spacing>
          </Spacing>

          {inputUUID && (
            <>
              <Divider muted />

              <Spacing p={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Text muted rightAligned small uppercase>
                    Preview
                  </Text>
                </Spacing>

                {!inputSettings?.type && (
                  <Text muted>
                    Select an input style for {inputUUID} before seeing a preview.
                  </Text>
                )}
                {inputSettings?.type && (
                  <InteractionDisplay
                    interaction={{
                      inputs: {
                        [inputUUID]: inputs?.[inputUUID],
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
                  />
                )}
              </Spacing>
            </>
          )}
        </ContainerStyle>
      </Spacing>
    );
  }), [
    inputs,
    mostRecentlyAddedVariableUUID,
    refMostRecentlyAddedVariable,
    setMostRecentlyTouchedVariableUUID,
    updateInteractionVariables,
    variables
  ]);

  const variableUUIDexists = useMemo(() => !!variables?.[newVariableUUID], [
    newVariableUUID,
    variables,
  ]);
  const inputUUIDexists = useMemo(() => !!inputs?.[newInputUUID], [
    inputs,
    newInputUUID,
  ]);

  const interactionLayoutMemo = useMemo(() => (
    <InteractionLayoutContainer
      containerRef={containerRef}
      containerWidth={containerWidth}
      interaction={interaction}
      showVariableUUID
      updateLayout={(
        layoutNew: InteractionLayoutItemType[][],
      ) => updateInteraction({
        layout: layoutNew,
      })}
    />
  ), [
    containerRef,
    containerWidth,
    interaction,
    updateInteraction,
  ]);

  const addNewVariableButtonMemo = useMemo(() => (
    <FlexContainer alignItems="center">
      {!isAddingNewVariable && (
        <Button
          beforeIcon={<Add />}
          compact
          onClick={(e) => {
            pauseEvent(e);
            setIsAddingNewVariable(true);
            setTimeout(() => refNewVariableUUID?.current?.focus(), 1);
          }}
          secondary
          small
        >
          Add new variable
        </Button>
      )}

      {isAddingNewVariable && (
        <>
          {variableUUIDexists && (
            <>
              <Text danger small>
                Variable already exists
              </Text>

              <Spacing mr={1} />
            </>
          )}

          <TextInput
            compact
            meta={{
              touched: !!variableUUIDexists,
              error: String(variableUUIDexists),
            }}
            monospace
            onChange={(e) => {
              pauseEvent(e);
              setNewVariableUUID(e.target.value);
            }}
            onClick={e => pauseEvent(e)}
            ref={refNewVariableUUID}
            small
            value={newVariableUUID || ''}
          />

          <Spacing mr={1} />

          <Button
            disabled={variableUUIDexists}
            compact
            onClick={(e) => {
              pauseEvent(e);

              if (!variableUUIDexists) {
                const layoutNew = [...(layout || [])];
                layoutNew.push([{
                  width: 1,
                  variable: newVariableUUID,
                }]);
                updateInteraction({
                  ...interaction,
                  layout: layoutNew,
                  variables: {
                    ...variables,
                    [newVariableUUID]: {},
                  },
                });
                setIsAddingNewVariable(false);
                setMostRecentlyAddedVariableUUID(newVariableUUID);
                setNewVariableUUID(null);

                setVisibleMappingForced({ '0': true });
                setTimeout(
                  () => {
                    refMostRecentlyAddedVariable?.current?.scrollIntoView();
                    setVisibleMappingForced({});
                  },
                  ANIMATION_DURATION_CONTENT + 100,
                );
              }
            }}
            primary
            small
          >
            Create variable
          </Button>

          <Spacing mr={1} />

          <Button
            compact
            onClick={(e) => {
              pauseEvent(e);

              setIsAddingNewVariable(false);
              setNewVariableUUID(null);
            }}
            secondary
            small
          >
            Cancel
          </Button>
        </>
      )}
    </FlexContainer>
  ), [
    isAddingNewVariable,
    layout,
    newVariableUUID,
    refMostRecentlyAddedVariable,
    refNewVariableUUID,
    setIsAddingNewVariable,
    setMostRecentlyAddedVariableUUID,
    setNewVariableUUID,
    setVisibleMappingForced,
    updateInteraction,
    variableUUIDexists,
    variables,
  ]);

  const addNewInputButtonMemo = useMemo(() => (
    <FlexContainer alignItems="center">
      {!isAddingNewInput && (
        <Button
          beforeIcon={<Add />}
          compact
          onClick={(e) => {
            pauseEvent(e);
            setIsAddingNewInput(true);
            setTimeout(() => refNewInputUUID?.current?.focus(), 1);
          }}
          secondary
          small
        >
          Add new input
        </Button>
      )}

      {isAddingNewInput && (
        <>
          {inputUUIDexists && (
            <>
              <Text danger small>
                Input already exists
              </Text>

              <Spacing mr={1} />
            </>
          )}

          <TextInput
            compact
            meta={{
              touched: !!inputUUIDexists,
              error: String(inputUUIDexists),
            }}
            monospace
            onClick={e => pauseEvent(e)}
            onChange={(e) => {
              pauseEvent(e);
              setNewInputUUID(e.target.value);
            }}
            ref={refNewInputUUID}
            small
            value={newInputUUID || ''}
          />

          <Spacing mr={1} />

          <Button
            disabled={inputUUIDexists}
            compact
            onClick={(e) => {
              pauseEvent(e);

              if (!inputUUIDexists) {
                if (mostRecentlyTouchedVariableUUID) {
                  updateInteraction({
                    ...interaction,
                    inputs: {
                      ...inputs,
                      [newInputUUID]: {},
                    },
                    variables: {
                      ...variables,
                      [mostRecentlyTouchedVariableUUID]: {
                        ...variables?.[mostRecentlyTouchedVariableUUID],
                        input: newInputUUID,
                      },
                    },
                  });
                } else {
                  updateInteractionInputs(newInputUUID, {});
                }

                setIsAddingNewInput(false);
                setMostRecentlyAddedInputUUID(newInputUUID);
                setMostRecentlyTouchedVariableUUID(null);
                setNewInputUUID(null);

                setVisibleMappingForced({ '1': true });
                setTimeout(
                  () => {
                    refMostRecentlyAddedInput?.current?.scrollIntoView();
                    setVisibleMappingForced({});
                  },
                  ANIMATION_DURATION_CONTENT + 100,
                );
              }
            }}
            primary
            small
          >
            Create input
          </Button>

          <Spacing mr={1} />

          <Button
            compact
            onClick={(e) => {
              pauseEvent(e);

              setIsAddingNewInput(false);
              setNewInputUUID(null);
            }}
            secondary
            small
          >
            Cancel
          </Button>
        </>
      )}
    </FlexContainer>
  ), [
    inputUUIDexists,
    inputs,
    interaction,
    isAddingNewInput,
    mostRecentlyTouchedVariableUUID,
    newInputUUID,
    refMostRecentlyAddedInput,
    refNewInputUUID,
    setIsAddingNewInput,
    setMostRecentlyAddedInputUUID,
    setMostRecentlyTouchedVariableUUID,
    setNewInputUUID,
    setVisibleMappingForced,
    updateInteractionInputs,
    variables,
  ]);

  return (
    <ContainerStyle ref={containerRef}>
      <HeadlineStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Text default large monospace>
              {uuid}
            </Text>

            {removeBlockInteraction && (
              <>
                <Spacing mr={PADDING_UNITS} />

                <Button
                  iconOnly
                  noBackground
                  noBorder
                  noPadding
                  onClick={() => removeBlockInteraction()}
                >
                  <Close default />
                </Button>
              </>
            )}
          </FlexContainer>
        </Spacing>
      </HeadlineStyle>

      <Divider muted />

      {children}

      <Accordion
        noBorder
        visibleMapping={{
          '0': true,
          '1': true,
          '2': true,
        }}
        visibleMappingForced={visibleMappingForced}
      >
        <AccordionPanel
          noBorderRadius
          noPaddingContent
          onClick={() => {
            setVisibleMappingForced({});
          }}
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={UNIT}
          title={(
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Spacing mr={PADDING_UNITS} py={1}>
                <Headline level={5}>
                  Variables
                </Headline>
              </Spacing>

              {Object.keys(variables || {})?.length >= 1 && addNewVariableButtonMemo}
            </FlexContainer>
          )}
        >
          <Spacing p={PADDING_UNITS}>
            {variablesMemo}
            {!Object.keys(variables || {})?.length && addNewVariableButtonMemo}
          </Spacing>
        </AccordionPanel>

        <AccordionPanel
          noBorderRadius
          noPaddingContent
          onClick={() => {
            setVisibleMappingForced({});
          }}
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={UNIT}
          title={(
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Spacing mr={PADDING_UNITS} py={1}>
                <Headline level={5}>
                  Inputs
                </Headline>
              </Spacing>

              {Object.keys(inputs || {})?.length >= 1 && addNewInputButtonMemo}
            </FlexContainer>
          )}
        >
          <Spacing p={PADDING_UNITS}>
            {inputsMemo}
            {!Object.keys(inputs || {})?.length && addNewInputButtonMemo}
          </Spacing>
        </AccordionPanel>

        <AccordionPanel
          noBorderRadius
          noPaddingContent
          onClick={() => {
            setVisibleMappingForced({});
          }}
          titleXPadding={PADDING_UNITS * UNIT}
          titleYPadding={UNIT}
          title={(
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Spacing mr={PADDING_UNITS} py={1}>
                <Headline level={5}>
                  Interaction layout
                </Headline>
              </Spacing>
            </FlexContainer>
          )}
        >
          <Spacing p={1}>
            {interactionLayoutMemo}
          </Spacing>

          {!layout?.length && (
            <Spacing px={PADDING_UNITS} pb={PADDING_UNITS}>
              <Text muted>
                Add at least 1 variable and associate an input to it and see a preview.
              </Text>
            </Spacing>
          )}
        </AccordionPanel>
      </Accordion>
    </ContainerStyle>
  );
}

export default InteractionSettings;
