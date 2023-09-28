import { useMemo } from 'react';

import ExtensionOptionType, { ExtensionOptionTemplateType } from '@interfaces/ExtensionOptionType';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { ExtensionProps } from '../constants';


type DBTProps = {
  extensionOption: ExtensionOptionType;
} & ExtensionProps;

function DBT({
  blocksInNotebook,
  extensionOption,
}: DBTProps) {
  const dbtBlocks =
    useMemo(() => blocksInNotebook?.filter(({ type }) => BlockTypeEnum.DBT === type) || [], [
      blocksInNotebook,
    ]);

  // https://docs.getdbt.com/docs/build/incremental-models#how-do-i-rebuild-an-incremental-model
  // https://docs.getdbt.com/reference/commands/run#refresh-incremental-models
  // https://docs.getdbt.com/reference/node-selection/graph-operators

  // Flags: --full-refresh
  // Prefix: +, 2+, 3+, @
  // Suffix: +, +4
  return (
    <>
    </>
  );
}

export default DBT;
