import Ansi from 'ansi-to-react';
import InnerHTML from 'dangerously-set-html-content';
import { useMemo } from 'react';

import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
  ExecutionStateEnum,
  MsgType,
} from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import useDataTable from './useDataTable';
import { HTMLOutputStyle } from './index.style';
import { TableDataType, prepareTableData } from './utils';
import { isJsonString } from '@utils/string';

export type OutputGroupType = {
  elements: JSX.Element[];
  output: KernelOutputType[];
};

export type OutputGroupsType = {
  html: OutputGroupType[];
  images: OutputGroupType[];
  json: OutputGroupType[];
  tables: OutputGroupType[];
  text: OutputGroupType[];
};

export default function useOutputGroups({
  outputs,
}: {
  outputs: KernelOutputType[];
}): OutputGroupsType {
  return useMemo(() => {
    const html = [];
    const images = [];
    const json = [];
    const tables = [];
    const text = [];

    outputs?.forEach((output) => {
      const {
        data: dataInit,
        data_types: dataTypes,
      } = output;

      const htmlData = [];
      const imagesData = [];
      const jsonData = [];
      const tablesData = [];
      const textData = [];

      (Array.isArray(dataInit) ? dataInit : [dataInit]).forEach((line: string, idx: number) => {
        const dataType = dataTypes?.[idx];
        let data = line;
        let dataJSON;

        if (isJsonString(data)) {
          dataJSON = JSON.parse(data);

          const {
            data: dataDisplay,
            type: typeDisplay,
          } = dataJSON;

          if (DataTypeEnum.TABLE === typeDisplay) {
            tablesData.push(useDataTable(prepareTableData(dataDisplay)));
          }
        }

        if (DataTypeEnum.TEXT_HTML === dataType) {
          htmlData.push(
            <HTMLOutputStyle monospace>
              <InnerHTML html={data} />
            </HTMLOutputStyle>
          );
        } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
          if (dataJSON) {
            jsonData.push(
              <Text monospace preWrap>
                <Ansi>
                  {JSON.stringify(dataJSON, null, 2)}
                </Ansi>
              </Text>
            );
          } else {
            const lines =
              data?.split('\\n')?.reduce((acc, dLine) => acc.concat(dLine?.split('\n')), []);
            textData.push(...lines.map((t) => (
              <Text key={t} monospace preWrap>
                {t?.length >= 1 && <Ansi>{t}</Ansi>}
                {!t?.length && <>&nbsp;</>}
              </Text>
            )));
          }
        } else if (DataTypeEnum.IMAGE_PNG === dataType) {
          imagesData.push(
            <div style={{ backgroundColor: 'white' }}>
              <img
                alt={`Image ${idx} from code output`}
                src={`data:image/png;base64, ${data}`}
              />
            </div>,
          );
        }
      });

      if (htmlData?.length >= 1) {
        html.push({
          elements: htmlData,
          output,
        });
      }
      if (imagesData?.length >= 1) {
        images.push({
          elements: imagesData,
          output,
        });
      }
      if (jsonData?.length >= 1) {
        json.push({
          elements: jsonData,
          output,
        });
      }
      if (tablesData?.length >= 1) {
        tables.push({
          elements: tablesData,
          output,
        });
      }
      if (textData?.length >= 1) {
        text.push({
          elements: textData,
          output,
        });
      }
    });

    return {
      html,
      images,
      json,
      tables,
      text,
    };
  }, [outputs]);
}
