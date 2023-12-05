import { useCallback, useMemo } from 'react';

import BlockType, { BlockTypeEnum} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { Settings } from '@oracle/icons';
import {
  StreamGridGroupInnerStyle,
  StreamGridGroupStyle,
  StreamGridStyle,
} from './index.style';
import { StreamType } from '@interfaces/IntegrationSourceType';
import {
  StreamMapping,
  buildStreamMapping,
  getDifferencesBetweenStreams,
  getParentStreamID,
  getSelectedStreams,
  getStreamFromStreamMapping,
  getStreamID,
  isStreamInMappings,
  isStreamSelected,
  updateStreamMetadata,
} from '@utils/models/block';
import { MainNavigationTabEnum, SubTabEnum } from './constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { pluralize } from '@utils/string';
import { sortByKey, sum } from '@utils/array';

type StreamGridPros = {
  block: BlockType;
  blocksMapping: {
    [blockUUID: string]: BlockType;
  };
  height: number;
  onChangeBlock?: (block: BlockType) => void;
  searchText?: string;
  setSelectedMainNavigationTab: (tabs: {
    selectedMainNavigationTab?: MainNavigationTabEnum;
    selectedMainNavigationTabSub?: string;
    selectedSubTab?: SubTabEnum | string;
  }) => {
    selectedMainNavigationTab?: MainNavigationTabEnum;
    selectedMainNavigationTabSub?: string;
    selectedSubTab?: SubTabEnum | string;
  };
  setSelectedSubTab: (subTab: SubTabEnum | string) => void;
  setStreamsMappingConflicts?: (prev: StreamMapping) => StreamMapping;
  streamsFetched?: StreamType[];
  updateStreamsInCatalog: (streams: StreamType[], callback?: (block: BlockType) => void) => any;
  width: number;
}

const GROUP_FETCHED = {
  label: (count: number) => `${pluralize('stream', count, true)} fetched`,
  uuid: 'Recently fetched',
};
const GROUP_EXISTS = {
  label: (count: number) => `${pluralize('stream', count, true)} from settings`,
  uuid: 'From stream settings',
};

const GROUPS = [
  GROUP_FETCHED,
  GROUP_EXISTS,
];

function filterStreams(searchText: string, arr: StreamType[]): StreamType[] {
  return arr?.filter((s: StreamType) => {
    const re = new RegExp(searchText || '', 'i');
    const id = getStreamID(s);

    return !searchText
      || id?.match(re)
      || id?.replace('-', ' ').match(re)
      || id?.replace('-', '').match(re)
      || id?.replace('_', ' ').match(re)
      || id?.replace('_', '').match(re)
      || id?.replaceAll('-', ' ').match(re)
      || id?.replaceAll('-', '').match(re)
      || id?.replaceAll('_', ' ').match(re)
      || id?.replaceAll('_', '').match(re)
  });
}

function StreamGrid({
  block,
  blocksMapping,
  height,
  onChangeBlock,
  searchText,
  setSelectedMainNavigationTab,
  setSelectedSubTab,
  setStreamsMappingConflicts,
  streamsFetched,
  updateStreamsInCatalog,
  width,
}: StreamGridPros) {
  const allStreamsFromCatalog = useMemo(() => getSelectedStreams(block, { getAll: true }), [
    block,
  ]);

  const streamsFromCatalogMapping: StreamMapping =
    useMemo(() => buildStreamMapping(allStreamsFromCatalog), [
      allStreamsFromCatalog,
    ]);
  const streamsFromFetchedMapping: StreamMapping =
    useMemo(() => buildStreamMapping(streamsFetched || []), [
      streamsFetched,
    ]);;

  const isStreamInBothPlaces =
    useCallback((stream: StreamType) => isStreamInMappings(
      stream,
      streamsFromFetchedMapping,
      streamsFromCatalogMapping,
    ), [
      streamsFromFetchedMapping,
      streamsFromCatalogMapping,
    ]);

  const getDiffs =
    useCallback((stream: StreamType) => getDifferencesBetweenStreams(
      stream,
      streamsFromFetchedMapping,
      streamsFromCatalogMapping,
    ), [
      streamsFromFetchedMapping,
      streamsFromCatalogMapping,
    ]);

  const getMappingByGroupUUID = useCallback((groupUUID: string) => ({
    [GROUP_FETCHED.uuid]: streamsFromFetchedMapping,
    [GROUP_EXISTS.uuid]: streamsFromCatalogMapping,
  })[groupUUID], [
    streamsFromCatalogMapping,
    streamsFromFetchedMapping,
  ]);

  const groupsOfStreams: {
    count: number;
    label: (count: number) => string;
    subgroups: {
      block: BlockType;
      streams: StreamType[];
    }[];
    uuid: string;
  }[] = useMemo(() => {
    const groups = [];

    GROUPS.forEach(({
      label,
      uuid: groupUUID,
    },idx: number) => {
      const mapping = getMappingByGroupUUID(groupUUID);
      const subgroups = [];

      const arrNoParents1 = Object.values(mapping?.noParents || {}) || [];
      const arrNoParents2 = filterStreams(searchText, arrNoParents1);
      if (arrNoParents2?.length >= 1) {
        subgroups.push({
          streams: sortByKey(arrNoParents2 || [], getStreamID),
        });
      }

      Object.entries(mapping?.parents || {})?.forEach(([parentStream, mapping2]) => {
        const arrParents1 = filterStreams(searchText, Object.values(mapping2 || {}) || []);

        if (arrParents1?.length >= 1) {
          subgroups.push({
            block: blocksMapping?.[parentStream],
            streams: sortByKey(arrParents1 || [], getStreamID),
          });
        }
      });

      if (subgroups?.length >= 1) {
        groups.push({
          count: sum(subgroups?.map(({ streams: arr }) => arr?.length || 0) || []),
          label,
          subgroups,
          uuid: groupUUID,
        });
      }
    });

    return groups;
  }, [
    getMappingByGroupUUID,
    searchText,
  ]);

  const groupsCount = useMemo(() => groupsOfStreams?.length || 0, [groupsOfStreams]);

  return (
    <>
      {groupsOfStreams?.map(({
        count,
        label,
        subgroups,
        uuid: groupUUID,
      }, idx1: number) => {
        const isFetchedGroup = GROUP_FETCHED.uuid === groupUUID;

        return (
          <StreamGridGroupStyle
            key={groupUUID}
            style={{
              height,
              right: GROUP_EXISTS.uuid === groupUUID ? null : 0,
              width: width / groupsCount,
            }}
          >
            <StreamGridGroupInnerStyle
              borderRight={groupsCount >= 2 && !isFetchedGroup}
              style={{
                height,
                width: width / groupsCount,
              }}
            >
              <Spacing pt={PADDING_UNITS}>
                <Spacing px={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                  <Headline level={4}>
                    {label(count)}
                  </Headline>
                </Spacing>

                {subgroups?.map(({
                  block: blockParent,
                  streams: streamsSubgroup,
                }, idx2: number) => (
                  <Spacing
                    key={blockParent ? blockParent?.uuid : `no-subtitle-${idx2}`}
                    mt={(blockParent && idx2 === 0) ? PADDING_UNITS : 1}
                  >
                    <Spacing
                      mb={blockParent ? PADDING_UNITS : 0}
                      mt={blockParent ? 0 : PADDING_UNITS}
                    >
                      <Divider light />
                    </Spacing>

                    {blockParent && (
                      <Spacing px={PADDING_UNITS}>
                        <Text
                          bold
                          color={getColorsForBlockType(blockParent?.type, {
                            blockColor: blockParent?.color,
                          })?.accent}
                          default
                          large
                          monospace
                        >
                          {blockParent?.uuid}
                        </Text>
                      </Spacing>
                    )}

                    <Spacing p={1}>
                      <FlexContainer alignItems="center" flexWrap="wrap">
                        {streamsSubgroup?.map((stream: StreamType) => {
                          const existsInBothPlaces = isStreamInBothPlaces(stream);
                          const isDifferent = !!getDiffs(stream);
                          const streamID = getStreamID(stream);
                          const parentStream = getParentStreamID(stream);

                          let selected = false;
                          if (isFetchedGroup) {
                            // Only show selected if this group is the fetched group
                            const streamFromMapping =
                              getStreamFromStreamMapping(
                                stream,
                                getMappingByGroupUUID(GROUP_EXISTS.uuid),
                              );
                            // and the stream exists in the catalog
                            if (streamFromMapping) {
                              // and that stream is selected in the catalog.
                              selected = isStreamSelected(streamFromMapping);
                            }
                          } else {
                            selected = isStreamSelected(stream);
                          }

                          const isDifferentWithExisting = existsInBothPlaces && isDifferent;

                          return (
                            <StreamGridStyle
                              key={streamID}
                              onClick={(isFetchedGroup && isDifferentWithExisting)
                                ? () => false
                                : (e) => {
                                  e.preventDefault();

                                  updateStreamsInCatalog([
                                    updateStreamMetadata(stream, {
                                      selected: !selected,
                                    }),
                                  ], b => onChangeBlock?.(b));
                                }
                              }
                              selected={selected}
                              warning={isDifferentWithExisting && isFetchedGroup}
                            >
                              <FlexContainer
                                alignItems="center"
                                fullHeight
                                justifyContent="space-between"
                              >
                                <Flex flex={1}>
                                  <Text monospace muted={!selected}>
                                    {streamID}
                                  </Text>
                                </Flex>

                                {isDifferentWithExisting && isFetchedGroup && (
                                  <>
                                    <Spacing mr={1} />

                                    <Text monospace warning>
                                      exists
                                    </Text>
                                  </>
                                )}

                                {isDifferentWithExisting && isFetchedGroup && (
                                  <>
                                    <Spacing mr={1} />

                                    <Flex alignItems="center" style={{ minHeight: 3 * UNIT }}>
                                      <Button
                                        compact
                                        onClick={() => {
                                          // @ts-ignore
                                          setStreamsMappingConflicts((prev: StreamMapping) => buildStreamMapping(
                                            [
                                              stream,
                                            ],
                                            prev,
                                          ));
                                          // @ts-ignore
                                          setSelectedMainNavigationTab((tabs: {
                                            selectedMainNavigationTab?: MainNavigationTabEnum;
                                            selectedMainNavigationTabSub?: string;
                                            selectedSubTab?: SubTabEnum | string;
                                          }) => ({
                                            selectedMainNavigationTab: streamID,
                                            selectedMainNavigationTabSub: parentStream,
                                            selectedSubTab: SubTabEnum.STREAM_CONFLICTS,
                                          }));
                                        }}
                                        small
                                        warning
                                      >
                                        View differences
                                      </Button>
                                    </Flex>
                                  </>
                                )}

                                {(!isDifferentWithExisting || !isFetchedGroup) && (
                                  <>
                                    <Spacing mr={UNITS_BETWEEN_SECTIONS} />

                                    {selected && <Settings size={2 * UNIT} />}

                                    <Spacing mr={selected ? 1 : 3} />

                                    <Flex alignItems="center" style={{ height: 3 * UNIT }}>
                                      <ToggleSwitch
                                        checked={selected}
                                        compact
                                        onCheck={(valFunc: (val: boolean) => boolean) => updateStreamsInCatalog([
                                          updateStreamMetadata(stream, {
                                            selected: valFunc(selected),
                                          }),
                                        ], b => onChangeBlock?.(b))}
                                      />
                                    </Flex>
                                  </>
                                )}

                              </FlexContainer>
                            </StreamGridStyle>
                          );
                        })}
                      </FlexContainer>
                    </Spacing>
                  </Spacing>
                ))}
              </Spacing>
            </StreamGridGroupInnerStyle>
          </StreamGridGroupStyle>
        );
      })}
    </>
  );
}

export default StreamGrid;
