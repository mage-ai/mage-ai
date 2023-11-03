import NextLink from 'next/link';
import { useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import ExtensionOptionType from '@interfaces/ExtensionOptionType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import ProjectType from '@interfaces/ProjectType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { AsideHeaderInnerStyle } from '@components/TripleLayout/index.style';
import { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import {
  SIDEKICK_VIEWS_BY_KEY,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getFormattedVariables } from './utils';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type SidekickHeaderProps = {
  activeView: ViewKeyEnum;
  pipeline: PipelineType;
  project?: ProjectType;
  secrets?: {
    [key: string]: any;
  }[];
  selectedBlock?: BlockType;
  setSelectedBlock?: (block: BlockType) => void;
  variables?: {
    [key: string]: any;
  }[];
};

function SidekickHeader({
  activeView,
  pipeline,
  project,
  secrets,
  selectedBlock,
  setSelectedBlock,
  variables,
}: SidekickHeaderProps) {
  const pipelineUUID = pipeline?.uuid;
  const query = queryFromUrl();
  const globalVars = getFormattedVariables(variables, (block) => block.uuid === GLOBAL_VARIABLES_UUID);

  const sidekickView = SIDEKICK_VIEWS_BY_KEY({
    project,
  })[activeView];
  let sidekickLabel = sidekickView?.buildLabel?.({
    pipeline,
    secrets,
    variables: globalVars,
  }) || sidekickView?.label;

  if (ViewKeyEnum.BLOCK_SETTINGS === activeView && selectedBlock?.uuid) {
    sidekickLabel = (
      <>
        Block settings for <Text
          bold
          color={getColorsForBlockType(selectedBlock?.type).accent}
          inline
          monospace
        >
          {selectedBlock?.uuid}
        </Text>
      </>
    );
  }

  let el = (
    <Text bold>
      {sidekickLabel}
    </Text>
  );

  const showExtensionDetails = ViewKeyEnum.EXTENSIONS === activeView && query?.extension;
  const { data } = api.extension_options.list({}, {}, {
    pauseFetch: !showExtensionDetails,
  });
  const extensionOptions: ExtensionOptionType[] =
    useMemo(() => data?.extension_options || [], [data]);
  const extensionOptionsByUUID = useMemo(() => indexBy(extensionOptions, ({ uuid }) => uuid), [
    extensionOptions,
  ]);

  const showAddonDetails = ViewKeyEnum.ADDON_BLOCKS === activeView && query?.addon;

  if (ViewKeyEnum.INTERACTIONS === activeView) {
    const breadcrumbs = [];

    if (selectedBlock?.uuid) {
      breadcrumbs.push(...[
        {
          label: () => 'All interactions',
          monospace: false,
          onClick: () => setSelectedBlock(null),
        },
        {
          bold: true,
          label: () => selectedBlock?.uuid,
          monospace: true,
        },
      ]);
    } else {
      breadcrumbs.push({
        bold: true,
        label: () => 'Interactions',
        monospace: false,
      });
    }

    el = (
      <Breadcrumbs
        breadcrumbs={breadcrumbs}
        noMarginLeft
      />
    );
  } else if (!activeView) {
    return <div />;
  } else if (showExtensionDetails) {
    const extensionOption = extensionOptionsByUUID[query?.extension];

    el = (
      <FlexContainer>
        <NextLink
          as={`/pipelines/${pipelineUUID}/edit?${VIEW_QUERY_PARAM}=${ViewKeyEnum.EXTENSIONS}`}
          href={'/pipelines/[pipeline]/edit'}
          passHref
        >
          <Link default>
            {sidekickLabel}
          </Link>
        </NextLink>
        <Text monospace muted>
          &nbsp;/&nbsp;
        </Text>
        <Text bold>
          {extensionOption?.name}
        </Text>
      </FlexContainer>
    );
  } else if (showAddonDetails) {
    el = (
      <FlexContainer>
        <NextLink
          as={`/pipelines/${pipelineUUID}/edit?${VIEW_QUERY_PARAM}=${ViewKeyEnum.ADDON_BLOCKS}`}
          href={'/pipelines/[pipeline]/edit'}
          passHref
        >
          <Link default>
            {sidekickLabel}
          </Link>
        </NextLink>
        <Text monospace muted>
          &nbsp;/&nbsp;
        </Text>
        <Text bold>
          {capitalizeRemoveUnderscoreLower(query?.addon)}
        </Text>
      </FlexContainer>
    );
  }

  return (
    <AsideHeaderInnerStyle>
      {el}
    </AsideHeaderInnerStyle>
  );
}

export default SidekickHeader;
