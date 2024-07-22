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

    const types = countOccurrences(output?.map(o => o.type));
    const typeMode = sortByKey(Object.entries(types), t => t?.[1])?.[0]?.[0];

    if (VariableTypeEnum.ITERABLE === typeMode) {
      const columns = [];
      const rows = [];
      output?.forEach(({
        data,
        type,
        uuid,
      }) => {
        if (Array.isArray(data) && data?.length > 0) {
          const sample = data?.[0];

          if (isObject(sample)) {
            data.forEach((data2) => {
              if (columns.length === 0) {
                columns.push(...Object.keys(data2).map(key => ({
                  key,
                  uuid: key,
                })));
              }

              rows.push(columns.map(({ key }, idx) => {
                let val2 = data2[key];

                if (isJsonString(val2)) {
                  val2 = JSON.parse(val2);
                }

                if (Array.isArray(val2) || isObject(val2)) {
                  if (!columns[idx].data?.type) {
                    columns[idx].data = {
                      ...columns[idx].data,
                      type: Array.isArray(val2)
                        ? VariableTypeEnum.ITERABLE
                        : VariableTypeEnum.DICTIONARY_COMPLEX,
                    };
                  }
                }

                return val2;
              }));
            });
          } else if (Array.isArray(data)) {
            if (columns.length === 0) {
              columns.push(...data?.map((_, index: number) => ({
                key: index,
                uuid: `col ${index}`,
              })));
            }

            rows.push(columns.map(({ key }, idx) => {
              let val2 = data[key];

              if (isJsonString(val2)) {
                val2 = JSON.parse(val2);
              }

              if (Array.isArray(val2) || isObject(val2)) {
                if (!columns[idx].data?.type) {
                  columns[idx].data = {
                    ...columns[idx].data,
                    type: Array.isArray(val2)
                      ? VariableTypeEnum.ITERABLE
                      : VariableTypeEnum.DICTIONARY_COMPLEX,
                  };
                }
              }

              return val2;
            }));
          }
        } else if (isObject(data)) {
          if (columns.length === 0) {
            columns.push(...Object.keys(data).map(key => ({
              key,
              uuid: key,
            })));
          }

          rows.push(columns.map(({ key }, idx: number) => {
            let val2 = data[key];

            if (isJsonString(val2)) {
              val2 = JSON.parse(val2);
            }

            if (Array.isArray(val2) || isObject(val2)) {
              if (!columns[idx].data?.type) {
                columns[idx].data = {
                  ...columns[idx].data,
                  type: Array.isArray(val2)
                    ? VariableTypeEnum.ITERABLE
                    : VariableTypeEnum.DICTIONARY_COMPLEX,
                };
              }
            }

            return val2;
          }));
        }
      });

      const maxHeight = Math.min(Math.max(containerRect?.height ?? 0, 600), 600);

      return (
        <DataTable
          boundingBox={{
            height: maxHeight - SCROLLBAR_TRACK_WIDTH - 2,
            width: (containerRect?.width ?? 0) - (SCROLLBAR_TRACK_WIDTH * 2) - 2,
          }}
          columns={columns}
          rect={{
            height: maxHeight,
            width: 1200,
          }}
          rows={rows}
        />
      );
    }

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
              label={pluralize('row', stats.rows)}
              semibold={false}
              secondary
              xsmall
            />
          )}

          {stats.columns !== null && (
            <Badge
              borderColorName="gray"
              label={pluralize('column', stats.columns)}
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
