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
  // UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import {
  // Check,
  // Close,
  // DocumentIcon,
  // Lightning,
  // PlugAPI,
  // Search,
  Settings,
  // SettingsWithKnobs,
  // Sun,
} from '@oracle/icons';
import { StreamGridStyle } from './index.style';
import { StreamType } from '@interfaces/IntegrationSourceType';
import {
  StreamMapping,
  buildStreamMapping,
  getDifferencesBetweenStreams,
  getSelectedStreams,
  getStreamFromStreamMapping,
  getStreamID,
  isStreamInMappings,
  isStreamSelected,
  updateStreamMetadata,
} from '@utils/models/block';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

type StreamGridPros = {
  block: BlockType;
  blocksMapping: {
    [blockUUID: string]: BlockType;
  };
  searchText?: string;
  streamsFetched?: StreamType[];
  updateStreamInCatalog: (stream: StreamType) => any;
}

const GROUP_FETCHED = {
  uuid: 'Recently fetched',
};
const GROUP_EXISTS = {
  uuid: 'Exists in stream settings',
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
      || id?.replace('_', ' ').match(re)
      || id?.replace('-', ' ').match(re)
  });
}

function StreamGrid({
  block,
  blocksMapping,
  searchText,
  streamsFetched,
  updateStreamInCatalog,
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
    subgroups: StreamType[];
    uuid: string;
  }[] = useMemo(() => {
    const groups = [];

    GROUPS.forEach(({
      uuid: groupUUID,
    },idx: number) => {
      const mapping = getMappingByGroupUUID(groupUUID);
      const subgroups = [];

      const arrNoParents1 = Object.values(mapping?.noParents || {}) || [];
      const arrNoParents2 = filterStreams(searchText, arrNoParents1);
      if (arrNoParents2?.length >= 1) {
        subgroups.push({
          streams: arrNoParents2,
        });
      }

      Object.entries(mapping?.parents || {})?.forEach(([parentStream, mapping2]) => {
        const arrParents1 = filterStreams(searchText, Object.values(mapping2 || {}) || []);

        if (arrParents1?.length >= 1) {
          subgroups.push({
            block: blocksMapping?.[parentStream],
            streams: arrParents1,
          });
        }
      });

      if (subgroups?.length >= 1) {
        groups.push({
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

  return (
    <>
      {groupsOfStreams?.map(({
        subgroups,
        uuid: groupUUID,
      }, idx1: number) => (
        <Spacing key={groupUUID} pt={idx1 === 0 ? PADDING_UNITS : 1}>
          {idx1 >= 1 && (
            <Spacing pb={PADDING_UNITS}>
              <Divider light />
            </Spacing>
          )}

          <Spacing px={PADDING_UNITS}>
            <Headline level={4}>
              {groupUUID}
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
                    const isFetchedGroup = idx1 === 0;

                    const existsInBothPlaces = isStreamInBothPlaces(stream);
                    const isDifferent = !!getDiffs(stream);
                    const streamID = getStreamID(stream);

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
                            updateStreamInCatalog(updateStreamMetadata(stream, {
                              selected: !selected,
                            }));
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
                            <Text bold monospace muted={!selected}>
                              {streamID}
                            </Text>
                          </Flex>

                          {isDifferentWithExisting && isFetchedGroup && (
                            <>
                              <Spacing mr={1} />

                              <Text warning>
                                stream exists with changes
                              </Text>

                              <Spacing mr={1} />

                              <Flex alignItems="center" style={{ height: 3 * UNIT }}>
                                <Button
                                  compact
                                  onClick={() => alert('Change to stream detail')}
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
                                  onCheck={valFunc => updateStreamInCatalog(
                                    updateStreamMetadata(stream, {
                                      selected: valFunc(selected),
                                    }),
                                  )}
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
      ))}
    </>
  );
}

export default StreamGrid;
