import NextLink from 'next/link';
import { CanvasRef } from 'reaflow';
import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import ExtensionOptionType from '@interfaces/ExtensionOptionType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import { SHARED_ZOOM_BUTTON_PROPS } from '@components/DependencyGraph/constants';
import {
  SIDEKICK_VIEWS_BY_KEY,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { SidekickHeaderContainerStyle } from './index.style';
import { getFormattedVariables } from './utils';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';


type SidekickHeaderProps = {
  activeView: ViewKeyEnum;
  depGraphZoom?: number;
  pipeline: PipelineType;
  secrets?: {
    [key: string]: any;
  }[];
  treeRef?: { current?: CanvasRef };
  variables?: {
    [key: string]: any;
  }[];
};

function SidekickHeader({
  activeView,
  depGraphZoom,
  pipeline,
  secrets,
  treeRef,
  variables,
}: SidekickHeaderProps) {
  const pipelineUUID = pipeline?.uuid;
  const query = queryFromUrl();
  const globalVars = getFormattedVariables(variables, (block) => block.uuid === GLOBAL_VARIABLES_UUID);

  const sidekickView = SIDEKICK_VIEWS_BY_KEY[activeView];
  const sidekickLabel = sidekickView?.buildLabel?.({
    pipeline,
    secrets,
    variables: globalVars,
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
  } else if (treeRef && ViewKeyEnum.TREE === activeView) {
    el = (
      <FlexContainer
        alignItems="center"
        fullWidth
        justifyContent="space-between"
      >
        {el}
        <Spacing mr={1} />
        <Flex alignItems="center">
          <Button
            {...SHARED_ZOOM_BUTTON_PROPS}
            onClick={() => {
              treeRef?.current?.zoomIn?.();
            }}
          >
            <Text noWrapping>
              Zoom in
            </Text>
          </Button>
          <Spacing mr={1} />
          <Button
            {...SHARED_ZOOM_BUTTON_PROPS}
            onClick={() => {
              treeRef?.current?.zoomOut?.();
            }}
          >
            <Text noWrapping>
              Zoom out
            </Text>
          </Button>
          <Spacing mr={1} />
          <Button
            {...SHARED_ZOOM_BUTTON_PROPS}
            onClick={() => {
              treeRef?.current?.fitCanvas?.();
            }}
          >
            <Text noWrapping>
              Reset
            </Text>
          </Button>
          <Spacing mr={1} />
          <Text bold>{depGraphZoom?.toFixed(2)}x</Text>
        </Flex>
      </FlexContainer>
    );
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
    <SidekickHeaderContainerStyle>
      {el}
    </SidekickHeaderContainerStyle>
  );
}

export default SidekickHeader;
