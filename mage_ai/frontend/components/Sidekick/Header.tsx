import NextLink from 'next/link';
import { useMemo } from 'react';

import ExtensionOptionType from '@interfaces/ExtensionOptionType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SIDEKICK_VIEWS_BY_KEY,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';

type SidekickHeaderProps = {
  activeView: ViewKeyEnum;
  pipeline: PipelineType;
  secrets?: {
    [key: string]: any;
  }[];
  variables?: {
    [key: string]: any;
  }[];
};

function SidekickHeader({
  activeView,
  pipeline,
  secrets,
  variables,
}: SidekickHeaderProps) {
  const pipelineUUID = pipeline?.uuid;
  const query = queryFromUrl();

  const sidekickView = SIDEKICK_VIEWS_BY_KEY[activeView];
  const sidekickLabel = sidekickView?.buildLabel?.({
    pipeline,
    secrets,
    variables,
  }) || sidekickView?.label;

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

  if (!activeView) {
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
  }

  return (
    <Spacing px={PADDING_UNITS}>
      {el}
    </Spacing>
  );
}

export default SidekickHeader;
