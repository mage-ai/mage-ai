import { useCallback, useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Select from '@oracle/elements/Inputs/Select';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { AttributeType, InputTypeEnum } from './constants';
import { AttributesMappingType } from '@utils/models/block';
import { pauseEvent } from '@utils/events';
import { remove } from '@utils/array';

type StreamSettingsEditorTableProps = {
  attributes: AttributeType[];
  attributesMapping: AttributesMappingType;
  columnFlex?: number[];
  rightAlignColumnForRowIndexes?: number[];
  rowGroupHeaders?: string[] | any[];
  rowsGroupedByIndex?: number[][];
  setAttributesMapping: (prev: (v: AttributesMappingType) => AttributesMappingType) => void;
};

function StreamSettingsEditorTable({
  attributes,
  attributesMapping,
  columnFlex,
  rightAlignColumnForRowIndexes,
  rowGroupHeaders,
  rowsGroupedByIndex,
  setAttributesMapping,
}: StreamSettingsEditorTableProps) {
  const renderRow = useCallback((attribute: AttributeType, idx: number) => {
    const {
      inputType,
      label,
      options,
      uuid,
    } = attribute;
    const data = attributesMapping?.[uuid];
    const isSelected = !!data?.selected;
    const value = data?.value;

    let inputEl;

    if (InputTypeEnum.CHECKBOX === inputType) {
      inputEl = (
        <Checkbox
          checked={!!value}
          onClick={(e) => {
            if (isSelected) {
              pauseEvent(e);
            }

            setAttributesMapping(prev => ({
              ...prev,
              [uuid]: {
                ...prev?.[uuid],
                value: !value,
              },
            }));
          }}
        />
      );
    } else if (InputTypeEnum.SELECT === inputType) {
      inputEl = (
        <Select
          compact
          fullWidth
          onChange={(e) => {
            pauseEvent(e);
            setAttributesMapping(prev => ({
              ...prev,
              [uuid]: {
                ...prev?.[uuid],
                value: e?.target?.value,
              },
            }));
          }}
          onClick={(e) => {
            if (isSelected) {
              pauseEvent(e);
            }
          }}
          value={value}
        >
          <option value="" />
          {options?.map(({
            disabled,
            label: labelOption,
            value,
          }) => (
            <option disabled={disabled} key={value} value={value}>
              {labelOption ? labelOption() : value}
            </option>
          ))}
        </Select>
      );
    } else if (InputTypeEnum.TOGGLE === inputType) {
      inputEl = (
        <ToggleSwitch
          checked={value as boolean}
          compact
          onCheck={(valFunc: (val: boolean) => boolean) => {
            setAttributesMapping(prev => ({
              ...prev,
              [uuid]: {
                ...prev?.[uuid],
                value: valFunc(value as boolean),
              },
            }));
          }}
          pauseEvent={isSelected}
        />
      );
    }

    return [
      <Checkbox
        checked={isSelected}
        key={`${uuid}-checkbox`}
        onClick={(e) => {
          pauseEvent(e);
          setAttributesMapping(prev => ({
            ...prev,
            [uuid]: {
              ...prev?.[uuid],
              selected: !isSelected,
            },
          }));
        }}
      />,
      <Text
        key={`${uuid}-name`}
        muted={!isSelected}
      >
        {label()}
      </Text>,
      <FlexContainer
        alignItems="center"
        justifyContent={rightAlignColumnForRowIndexes?.includes(idx)
          ? 'flex-end'
          : 'center'
        }
        key={`${uuid}-value`}
      >
        {inputEl}
      </FlexContainer>,
    ];
  }, [
    attributesMapping,
    rightAlignColumnForRowIndexes,
    setAttributesMapping,
  ]);

  const tableMemo = useMemo(() => {
    return (
      <Table
        columnFlex={columnFlex || [null, 1, null]}
        columns={[
          {
            uuid: 'Use',
          },
          {
            uuid: 'Attribute',
          },
          {
            uuid: 'Value',
          },
        ]}
        groupsInline
        onClickRow={(rowIndex: number) => {
          const attribute = attributes?.[rowIndex];
          const uuid = attribute?.uuid;
          const data = attributesMapping?.[uuid];
          const isSelected = !!data?.selected;

          setAttributesMapping(prev => ({
            ...prev,
            [uuid]: {
              ...prev?.[uuid],
              selected: !isSelected,
            },
          }));
        }}
        rowGroupHeaders={rowGroupHeaders}
        rowsGroupedByIndex={rowsGroupedByIndex}
        rows={attributes.map((a, idx: number) => renderRow(a, idx))}
      />
    );
  }, [
    attributes,
    attributesMapping,
    columnFlex,
    renderRow,
  ]);

  return tableMemo;
}

export default StreamSettingsEditorTable;
