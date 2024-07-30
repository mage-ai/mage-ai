import Ansi from 'ansi-to-react';
import Badge from '@mana/elements/Badge';
import DataTable from '@mana/components/Table/DataTable';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import { ExecutionOutputType, VariableTypeEnum } from '@interfaces/CodeExecutionType';
import { SCROLLBAR_TRACK_WIDTH } from '@mana/themes/scrollbars';
import { countOccurrences, sortByKey } from '@utils/array';
import { isJsonString, pluralize } from '@utils/string';
import { isObject } from '@utils/hash';
import { useMemo } from 'react';

interface ExecutionOutputProps {
  containerRect: DOMRect;
  executionOutput: ExecutionOutputType;
}

export default function ExecutionOutput({
  containerRect,
  executionOutput,
}: ExecutionOutputProps) {
  let output = executionOutput?.output ?? [];

  if (!Array.isArray(output)) {
    output = [output];
  }

  const outputMemo = useMemo(() => {
    let output = executionOutput?.output ?? [];

    if (!Array.isArray(output)) {
      output = [output];
    }

    const hasData = output?.some(outp => outp && 'data' in outp);
    if (!hasData) return;

    const types = countOccurrences(output?.map(o => o.type));
    const typeMode = sortByKey(Object.entries(types), t => t?.[1])?.[0]?.[0];

    const columns = [];
    const rows = [];
    const columnsByRow = [];
    hasData && output?.forEach(({
      data,
      type,
      uuid,
    }) => {
      // console.log(
      //   Array.isArray(data),
      //   data?.length > 0,
      // )
      if (!(data ?? false)) return;

      if (VariableTypeEnum.ITERABLE === typeMode) {
        if (Array.isArray(data) && data?.length > 0) {
          const sample = data?.[0];

          // console.log(
          //   'array', Array.isArray(sample),
          //   'object', isObject(sample),
          //   'sample', sample,
          // )

          if (!Array.isArray(sample) && isObject(sample)) {
            if (columns.length === 0) {
              Object.entries(sample ?? {}).forEach(([key, val2]) => {
                const col: {
                  data?: {
                    type?: VariableTypeEnum;
                  };
                  key: string;
                  uuid: string;
                } = {
                  key,
                  uuid: key,
                };

                if (isJsonString(val2)) {
                  val2 = JSON.parse(val2);
                }

                if (Array.isArray(val2) || isObject(val2)) {
                  col.data = {
                    type: Array.isArray(val2)
                      ? VariableTypeEnum.ITERABLE
                      : VariableTypeEnum.DICTIONARY_COMPLEX,
                  };
                }

                columns.push(col);
              });

              // console.log('columns', columns)
            }

            data.forEach((data2) => {
              const row = columns.map(({ key }) => data2[key]);

              rows.push(row);
            });
          } else if (Array.isArray(sample)) {
            if (columns.length === 0) {
              columns.push(...sample?.map((val2, colIdx: number) => {
                const col: {
                  data?: {
                    type?: VariableTypeEnum;
                  };
                  key: number;
                  uuid: string;
                } = {
                  key: colIdx,
                  uuid: `col ${colIdx}`,
                };

                if (isJsonString(val2)) {
                  val2 = JSON.parse(val2);
                }

                if (Array.isArray(val2) || isObject(val2)) {
                  col.data = {
                    type: Array.isArray(val2)
                      ? VariableTypeEnum.ITERABLE
                      : VariableTypeEnum.DICTIONARY_COMPLEX,
                  };
                }

                return col;
              }));
            }

            rows.push(...data);
          }
        } else if (isObject(data)) {
          if (columns.length === 0) {
            Object.entries(data ?? {}).forEach(([key, val2]) => {
              const col: {
                data?: {
                  type?: VariableTypeEnum;
                };
                key: string;
                uuid: string;
              } = {
                key,
                uuid: key,
              };

              if (isJsonString(val2)) {
                val2 = JSON.parse(val2);
              }

              if (Array.isArray(val2) || isObject(val2)) {
                col.data = {
                  type: Array.isArray(val2)
                    ? VariableTypeEnum.ITERABLE
                    : VariableTypeEnum.DICTIONARY_COMPLEX,
                };
              }

              columns.push(col);
            });
          }

          const row = columns.map(({ key }) => data[key]);

          rows.push(row);
        } else {
          columnsByRow.push({
            key: 0,
            uuid: 'output',
          });
          rows.push([data]);
        }
      } else {
        columnsByRow.push({
          key: 0,
          uuid: 'output',
        });
        rows.push([data]);
      }
    });

    if (columns.length === 0 && columnsByRow.length > 0) {
      columns.push(columnsByRow[0]);
    }

    // console.log('output', output)
    // console.log('columns', columns)
    // console.log('rows', rows)

    const maxHeight = Math.min(Math.max(containerRect?.height ?? 0, 600), 600);

    return (
      <DataTable
        boundingBox={{
          left: 0,
          top: 0,
          height: maxHeight - SCROLLBAR_TRACK_WIDTH - 2,
          width: (containerRect?.width ?? 0) - (SCROLLBAR_TRACK_WIDTH * 2) - 2,
        }}
        columns={columns}
        rect={{
          left: 0,
          top: 0,
          height: maxHeight,
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
        }}
        rows={rows}
      />
    );

    return output?.map(({
      data,
      type,
      uuid,
    }) => {
      let el;

      if (VariableTypeEnum.ITERABLE === type) {
      } else if (isObject(data)) {
        el = (
          <Text monospace small>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
              }}
            >
              <Ansi>
                {output && JSON.stringify(output, null, 2)}
              </Ansi>
            </pre>
          </Text>
        );
      }

      return (
        <div key={uuid}>
          {el}
        </div>
      );
    });
  }, [containerRect, executionOutput]);

  const stats = useMemo(() => {
    let columns = null;
    let rows = null;

    output?.forEach((o) => {
      o?.statistics?.forEach((s) => {
        if ((s.original_column_count ?? null) !== null) {
          columns = columns === null ? 0 : columns;
          columns += s?.original_column_count ?? 0;
        }

        if ((s.original_row_count ?? null) !== null) {
          rows = rows === null ? 0 : rows;
          rows += s?.original_row_count ?? 0;
        }
      });
    });

    return {
      columns,
      rows,
    };
  }, [output]);

  return (
    <Grid rowGap={8} templateColumns={1} autoFlow="row" paddingTop={4}>
      {(stats.columns !== null || stats.rows !== null) && (
        <Grid columnGap={8} templateColumns="max-content" templateRow="1fr" justifyContent="start" autoFlow="column">
          {stats.rows !== null && (
            <Badge
              borderColorName="gray"
              inline
              label={pluralize('row', stats.rows, true)}
              semibold={false}
              secondary
              xsmall
            />
          )}

          {stats.columns !== null && (
            <Badge
              borderColorName="gray"
              inline
              label={pluralize('column', stats.columns, true)}
              semibold={false}
              secondary
              xsmall
            />
          )}
        </Grid>
      )}

      {outputMemo}
    </Grid>
  );
}
