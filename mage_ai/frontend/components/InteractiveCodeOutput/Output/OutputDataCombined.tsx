import { useMemo } from 'react';

import OutputRow from './OutputRow';
import { OutputGroupsType } from './useOutputGroups';
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
      elements,
      output,
    }) => accInner.concat(elements?.map(element => ({
      element,
      output,
    })) || []), []) || []), []);

    return sortByKey(
      combinedFlatten,
      ({ output }) => output?.execution_metadata?.date,
    ).map(({
      element,
      output,
    }, idx: number) => (
      <OutputRow
        key={`${output?.uuid}-${output?.msg_id}-${idx}`}
        output={output}
      >
        {element}
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
