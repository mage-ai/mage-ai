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
import { isObject } from '@utils/hash';

export type ElementWithType = {
  dataType: DataTypeEnum;
  element: JSX.Element;
};

export type OutputGroupType = {
  elementsWithType: ElementWithType[];
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
  errors,
  outputs,
}: {
  errors: KernelOutputType[];
  outputs: KernelOutputType[];
}): OutputGroupsType {
  const html = [];
  const images = [];
  const json = [];
  const tables = [];
  const text = [];


  errors?.forEach((output) => {
    const textDataError = [];

    const {
      content,
    } = output;

    [
      content?.ename,
      content?.evalue,
      ...(content?.traceback || []),
    ].forEach((t) => textDataError.push({
      dataType: DataTypeEnum.TEXT,
      element: (
        <Text key={t} monospace preWrap>
          {t?.length >= 1 && <Ansi>{t}</Ansi>}
          {!t?.length && <>&nbsp;</>}
        </Text>
      ),
    }));

    if (textDataError?.length >= 1) {
      text.push({
        elementsWithType: textDataError,
        output,
      });
    }
  });

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
        const temp = JSON.parse(data);
        if (isObject(temp)) {
          dataJSON = temp;

          const {
            data: dataDisplay,
            type: typeDisplay,
          } = dataJSON;

          if (DataTypeEnum.TABLE === typeDisplay) {
            tablesData.push({
              dataType: DataTypeEnum.TABLE,
              element: useDataTable(prepareTableData(dataDisplay)),
            });
          }
        }
      }

      if (DataTypeEnum.TEXT_HTML === dataType) {
        htmlData.push({
          dataType: DataTypeEnum.TEXT_HTML,
          element: (
            <HTMLOutputStyle monospace>
              <InnerHTML html={data} />
            </HTMLOutputStyle>
          ),
        });
      } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
        if (dataJSON) {
          jsonData.push({
            dataType: DataTypeEnum.TEXT,
            element: (
              <Text monospace preWrap>
                <Ansi>
                  {JSON.stringify(dataJSON, null, 2)}
                </Ansi>
              </Text>
            ),
          });
        } else {
          const lines =
            data?.split('\\n')?.reduce((acc, dLine) => acc.concat(dLine?.split('\n')), []);
          textData.push(...lines.map((t) => ({
            dataType: DataTypeEnum.TEXT,
            element: (
              <Text key={t} monospace preWrap>
                {t?.length >= 1 && <Ansi>{t}</Ansi>}
                {!t?.length && <>&nbsp;</>}
              </Text>
            ),
          })));
        }
      } else if (DataTypeEnum.IMAGE_PNG === dataType) {
        imagesData.push({
          dataType: DataTypeEnum.IMAGE_PNG,
          element: (
            <div style={{ backgroundColor: 'white' }}>
              <img
                alt={`Image ${idx} from code output`}
                src={`data:image/png;base64, ${data}`}
              />
            </div>
          ),
        });
      }
    });

    if (htmlData?.length >= 1) {
      html.push({
        elementsWithType: htmlData,
        output,
      });
    }
    if (imagesData?.length >= 1) {
      images.push({
        elementsWithType: imagesData,
        output,
      });
    }
    if (jsonData?.length >= 1) {
      json.push({
        elementsWithType: jsonData,
        output,
      });
    }
    if (tablesData?.length >= 1) {
      tables.push({
        elementsWithType: tablesData,
        output,
      });
    }
    if (textData?.length >= 1) {
      text.push({
        elementsWithType: textData,
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
}
