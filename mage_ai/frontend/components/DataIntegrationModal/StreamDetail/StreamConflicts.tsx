import { useCallback, useMemo, useState } from 'react';

import {
  COLUMN_TYPES,
  MetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
} from '@interfaces/IntegrationSourceType';

function StreamConflicts() {
  const [selectedPropertiesToMerge, setSelectedPropertiesToMerge] = useState<{
    [column: string]: SchemaPropertyType;
  }>(null);

  const diffs = useMemo(() => getDifferencesBetweenStreams(
    stream,
    streamsMappingConflicts,
    streamMapping,
  ), [
    stream,
    streamMapping,
    streamsMappingConflicts,
  ]);

  const updateColumnsInSelectedPropertiesToMerge = useCallback((columns, value) => {
    setSelectedPropertiesToMerge(prev => {
      const updated = {
        ...prev,
      };

      columns?.forEach((column: string) => {
        if (value) {
          updated[column] = true;
        } else {
          if (column in updated) {
            delete updated?.[column];
          }
        }
      });

      return updated;
    });
  }, [
    setSelectedPropertiesToMerge,
  ])

  const renderConflictRow = useCallback((opts: {
    column: string;
    property: SchemaPropertyType;
    currentProperty?: SchemaPropertyType;
  }) => {
    const {
      column,
      property,
      currentProperty,
    } = opts || {};
    const isSelected = !!selectedPropertiesToMerge?.[column];

    const arr = [
      <Checkbox
        checked={isSelected}
        key={`${column}-accept`}
        onClick={(e) => {
          pauseEvent(e);
          updateColumnsInSelectedPropertiesToMerge([column], !isSelected);
        }}
      />,
      <Text
        key={`${column}-property`}
        monospace
      >
        {column}
      </Text>,
      renderTypes(column, property, {
        disableEdit: true,
      }),
    ];

    if (currentProperty) {
      arr.push(
        renderTypes(column, currentProperty, {
          disableEdit: true,
          key: 'types-current',
        }),
      );
    } else {
      arr.push(<div key={`${column}-empty`} />);
    }

    return arr;
  }, [
    renderTypes,
    selectedPropertiesToMerge,
    setSelectedPropertiesToMerge,
    updateColumnsInSelectedPropertiesToMerge,
  ]);

  const renderTableConflict = useCallback((rows: any[][], opts?: {
    columnFlex?: number[];
    columns?: ColumnType[];
  }) => {
    const {
      columnFlex: cf,
      columns: c,
    } = opts || {};

    const allColumns = rows?.map(({ column }) => column) || [];
    const allColumnsSelected = allColumns?.every(column => !!selectedPropertiesToMerge?.[column]);

    return (
      <Table
        columnFlex={[null, 1].concat(cf || [])}
        columns={[
          {
            label: () => (
              <Checkbox
                checked={allColumnsSelected}
                onClick={(e) => {
                  pauseEvent(e);

                  updateColumnsInSelectedPropertiesToMerge(allColumns, !allColumnsSelected);
                }}
              />
            ),
            uuid: 'Accept change',
          },
          {
            uuid: 'Property',
          },
        ].concat(c || [])}
        highlightRowOnHover
        onClickRow={(index: number) => {
          const row = rows?.[index];
          const column = row?.column;
          const isSelected = !!selectedPropertiesToMerge?.[column];

          updateColumnsInSelectedPropertiesToMerge([column], !isSelected);
        }}
        rows={rows?.map(renderConflictRow)}
      />
    );
  }, [
    renderConflictRow,
    selectedPropertiesToMerge,
    updateColumnsInSelectedPropertiesToMerge,
  ]);

  const tableConflictMemo = useMemo(() => {
    if (!diffs) {
      return null;
    }

    const {
      newColumnSettings,
      newColumns,
      stream: streamDiffs,
    } = diffs;

    const schemaPropertiesDiffs = streamDiffs?.schema?.properties;
    const rowsNewColumns = newColumns?.map((column: string) => {
      const property = schemaPropertiesDiffs?.[column];

      return {
        column,
        property,
      };
    });

    const rowsNewColumnsSettings = Object.entries(newColumnSettings).map(([
      column,
      property,
    ]) => ({
      column,
      property: schemaPropertiesDiffs?.[column],
      currentProperty: schemaProperties?.[column],
    }));

    return (
      <>
        <Spacing p={PADDING_UNITS}>
          <Headline level={5} warning>
            New properties
          </Headline>
        </Spacing>

        <Divider light />

        {renderTableConflict(rowsNewColumns, {
          columnFlex: [1, 1],
          columns: [
            {
              uuid: 'Types (new)',
            },
            {
              label: () => '',
              uuid: 'empty',
            },
          ],
        })}

        <Spacing p={PADDING_UNITS}>
          <Headline level={5} warning>
            Properties with new types
          </Headline>
        </Spacing>

        <Divider light />

        {renderTableConflict(rowsNewColumnsSettings, {
          columnFlex: [1, 1],
          columns: [
            {
              uuid: 'Types (new)',
            },
            {
              uuid: 'Types (current)',
            },
          ],
        })}
      </>
    );
  }, [
    diffs,
    renderTableConflict,
    schemaProperties,
    stream,
  ]);

  return (
    <Spacing my={PADDING_UNITS}>
      <Spacing px={PADDING_UNITS}>
        <CalloutStyle>
          <FlexContainer alignItems="center">
            <Flex>
              <AlertTriangle size={2 * UNIT} warning />
            </Flex>

            <Spacing mr={PADDING_UNITS} />

            <Text muted>
              The following properties are either new or have different types.
              Please review and either merge the changes or discard them.
            </Text>
          </FlexContainer>
        </CalloutStyle>
      </Spacing>

      {tableConflictMemo}

      <Spacing p={PADDING_UNITS}>
        <FlexContainer>
          <Button
            beforeIcon={<BranchAlt />}
            onClick={() => {

            }}
            primary
          >
            Merge changes
          </Button>

          <Spacing mr={1} />

          <Button
            onClick={() => {

            }}
            secondary
          >
            Discard changes
          </Button>
        </FlexContainer>
      </Spacing>
    </Spacing>
  );
}

export default StreamConflicts;
