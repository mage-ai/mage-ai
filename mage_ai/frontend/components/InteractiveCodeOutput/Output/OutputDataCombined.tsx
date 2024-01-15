import { useMemo } from 'react';

import OutputRow from './OutputRow';
import { ElementWithType, OutputGroupsType } from './useOutputGroups';
import { sortByKey } from '@utils/array';

function OutputDataCombined({
  html,
  images,
  json,
  tables,
  text,
}: OutputGroupsType) {
  return useMemo(() => {
    const combinedFlatten = [
      html,
      images,
      json,
      tables,
      text,
    ].reduce((acc, arr) => acc.concat(arr?.reduce((accInner, {
      elementsWithType,
      output,
    }) => accInner.concat(elementsWithType?.map(elementWithType => ({
      elementWithType,
      output,
    })) || []), []) || []), []);

    return sortByKey(
      combinedFlatten,
      ({ output }) => output?.execution_metadata?.date,
    ).map(({
      elementWithType,
      output,
    }, idx: number) => (
      <OutputRow
        dataType={elementWithType?.dataType}
        key={`${output?.uuid}-${output?.msg_id}-${idx}`}
        output={output}
      >
        {elementWithType?.element}
      </OutputRow>
    ));
  }, [
    html,
    images,
    json,
    tables,
    text,
  ]);
}

export default OutputDataCombined;
