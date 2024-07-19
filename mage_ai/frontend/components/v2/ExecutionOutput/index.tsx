import { ExecutionOutputType, VariableTypeEnum } from '@interfaces/CodeExecutionType';
import { SCROLLBAR_TRACK_WIDTH } from '@mana/themes/scrollbars';
import DataTable from '@mana/components/DataTable';
import { useMemo } from 'react';
import Ansi from 'ansi-to-react';
import Text from '@mana/elements/Text';
import { isObject } from '@utils/hash';
import { countOccurrences, sortByKey } from '@utils/array';
import { isJsonString } from '@utils/string';

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
            width: containerRect?.width - (SCROLLBAR_TRACK_WIDTH * 2) - 2,
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

  return (
    <div>
      {outputMemo}
    </div>
  );
}
