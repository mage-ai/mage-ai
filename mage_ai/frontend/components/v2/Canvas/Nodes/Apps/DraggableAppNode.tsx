import Button, { ButtonGroup } from '@mana/elements/Button';
import React, { useEffect, useMemo, useRef } from 'react';
import TextInput from '@mana/elements/Input/TextInput';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import stylesEditor from '@styles/scss/components/Canvas/Nodes/Apps/Editor.module.scss';
import useAppEventsHandler, { CustomAppEventEnum, convertEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import { AppNodeType, NodeType, RectType } from '../../interfaces';
import { getColorNamesFromItems } from '../utils';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import useApp from '../../../Apps/Editor/useApp';
import useExecutable from '../useExecutable';
import { DEBUG } from '@components/v2/utils/debug';
import { DragAndDropType } from '../types';
import { EditorContainerStyled } from './index.style';
import { ExecutionManagerType } from '../../../ExecutionManager/interfaces';
import { Minimize, Chat, BlockGenericV2, PlayButtonFilled } from '@mana/icons';
import { NodeWrapper } from '../NodeWrapper';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { convertToMillisecondsTimestamp } from '@utils/date';
import { draggableProps } from '../draggable/utils';
import { setupDraggableHandlers } from '../utils';
import {
  ArrowsAdjustingFrameSquare, DiamondShared, AppVersions, IdentityTag, Menu, PanelCollapseLeft,
  PanelCollapseRight, Builder, AddV2, Grab, GroupV2, Comment, Conversation, Save,
  CloseV2
} from '@mana/icons';

const PADDING_HORIZONTAL = 16;

type DraggableAppNodeProps = {
  draggable?: boolean;
  index?: number;
  items: NodeType[];
  node: AppNodeType;
  rect: RectType;
  registerConsumer: ExecutionManagerType['registerConsumer'];
} & DragAndDropType;

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  draggable,
  handlers,
  index = 0,
  items,
  node,
  rect,
  registerConsumer,
}: DraggableAppNodeProps) => {
  const fetchDetailCountRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement>(null);

  const { dispatchAppEvent } = useAppEventsHandler(node);
  const { phaseRef } = useDispatchMounted(node, nodeRef);

  const app = useMemo(() => node?.app, [node]);

  const renderRef = useRef(0);
  DEBUG.editor.node &&
    console.log(
      '[DraggableAppNode] render',
      app?.status,
      renderRef.current++,
      phaseRef.current,
      node,
    );

  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [asideAfterOpen, setAsideAfterOpen] = React.useState(false);

  const item = items?.[index];
  const block = item?.block;
  const { configuration } = block ?? {};
  const { file } = configuration ?? {};

  const appOptions = {
    configurations: {
      dimension: {
        height: Math.max(rect?.height ?? 0, 400),
        width: Math.max(rect?.width ?? 0, 400),
      },
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: PADDING_HORIZONTAL,
      lineNumbers: 'off',
      lineNumbersMinChars: 0,
    },
    file: file ?? {
      ...configuration?.file_source,
      path: configuration?.file_path,
    },
  };
  const { editor, main, mutate, toolbars } = useApp({
    app: {
      ...app,
      options: appOptions,
    },
    editor: {
      containerClassName: [
        stylesEditor.editorContainer,
      ].filter(Boolean).join(' '),
      editorClassName: [
        stylesEditor.editorMain,
      ].filter(Boolean).join(' '),
      persistResourceOnUnmount: true,
      style: {},
    },
    skipInitialFetch: true,
    useToolbars: true,
  });
  const {
    inputRef,
    main: mainContentResource,
    original,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
    stale,
  } = toolbars ?? {} as any;

  const { containerRef, executeCode } = useExecutable(block?.uuid, String(node?.id), registerConsumer);

  useEffect(() => {
    if (fetchDetailCountRef.current === 0 && file?.path) {
      mutate.detail.mutate({ id: file.path });
      fetchDetailCountRef.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, file]);

  function handleStopApp(event: MouseEvent) {
    dispatchAppEvent(CustomAppEventEnum.STOP_APP, {
      event: convertEvent(event, {
        app: node.app,
        node,
      }),
    });
  }

  function handleUpdateLayout(event: MouseEvent) {
    dispatchAppEvent(CustomAppEventEnum.START_DRAGGING, {
      event: convertEvent(event, {
        app: node.app,
        node,
      }),
    });
  }

  const draggingHandlers = setupDraggableHandlers(
    handlers, node, nodeRef, block,
  );

  const sharedProps = useMemo(() => draggableProps({
    classNames: [styles.appNodeWrapper],
    draggable,
    item: node,
  }), [draggable, node]);

  const colorNames = getColorNamesFromItems([item]);
  const baseColor = colorNames?.[index]?.base;
  const lastModified = useMemo(() => {
    if (original?.modified_timestamp) {
      return moment(convertToMillisecondsTimestamp(original?.modified_timestamp ?? 0)).fromNow();
    }
  }, [original?.modified_timestamp]);

  return (
    <NodeWrapper
      {...sharedProps}
      // draggingNode={draggingNode}
      handlers={draggingHandlers}
      item={node}
      itemRef={nodeRef}
      rect={rect}
    >
      <div className={[
        styles.appNodeContainer,
        app?.status && styles[app?.status],
      ]?.filter(Boolean)?.join((' '))}>
        <Grid
          rowGap={PADDING_HORIZONTAL / 2}
          style={{
            gridTemplateRows: 'auto auto 1fr auto',
          }}
          templateColumns="auto"
        >
          <Grid
            columnGap={PADDING_HORIZONTAL / 2}
            style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
            templateRows="1fr"
          >
            <Button
              Icon={asideBeforeOpen ? PanelCollapseLeft : BlockGenericV2}
              basic={asideBeforeOpen}
              onClick={() => setAsideBeforeOpen(prev => !prev)}
              small
            />

            <Button
              Icon={PlayButtonFilled}
              backgroundcolor={baseColor}
              basic
              bordercolor={baseColor}
              onClick={() => executeCode(editor.getValue())}
              small
            />

            <TextInput basic placeholder="/" style={{ paddingBottom: 8, paddingTop: 8 }} />

            {/* <Button
              Icon={asideAfterOpen ? PanelCollapseRight : Builder}
              basic={asideAfterOpen}
              onClick={() => setAsideAfterOpen(true)}
              small
            /> */}

            <Button
              Icon={Grab}
              onClick={event => handleUpdateLayout(event as any)}
              small
            />
          </Grid>

          <Grid
            autoFlow="column"
            backgroundColor="graylo"
            borders
            columnGap={40}
            justifyContent="start"
            paddingBottom={6}
            paddingLeft={PADDING_HORIZONTAL}
            paddingRight={PADDING_HORIZONTAL}
            paddingTop={6}
            templateRows="auto"
          >
            {[
              {
                Icon: Save,
                description: stale ? `You have unsaved changes. Content was modified ${lastModified}.` : 'Save current file content.',
                iconProps: stale ? { colorName: 'red' } : {},
                onClick: saveCurrentContent,
                uuid: 'Save',
              },
              {
                Icon: Conversation,
                uuid: 'Chat',
                description: 'Get support in the community channel on Slack', href: 'https://mage.ai/chat', target: '_blank', anchor: 'true'
              },
              // {
              //   Icon: Grab,
              //   uuid: 'Layout',
              //   description: 'Drag to reposition app',
              //   onClick: handleUpdateLayout,
              // },
              {
                Icon: Comment,
                uuid: 'Comment',
                description: 'Add a comment to the pipeline or for a specific block',
                onClick: event => alert('Comment'),
              },
              {
                Icon: CloseV2,
                uuid: 'Close',
                description: 'Close app',
                onClick: handleStopApp,
              },
            ].map(({ Icon, anchor, label, description, href, iconProps, target, uuid, onClick }) => (
              <TooltipWrapper
                key={uuid}
                tooltip={<Text secondary small>{description ?? label?.() ?? uuid}</Text>}
              >
                <Button
                  Icon={iconPropsInit => Icon && <Icon {...{ ...iconPropsInit, ...iconProps }} />}
                  anchor={anchor}
                  basic
                  data-loading-style="inline"
                  href={href}
                  // loading
                  onClick={onClick ?? undefined}
                  small
                  style={{ background: 'none', border: 'none' }}
                  target={target}
                >
                  {label &&
                    <Text medium small>
                      {label()}
                    </Text>
                  }
                </Button>
              </TooltipWrapper>
            ))}
          </Grid>

          <Grid
            borders
            templateRows="auto 1fr"
          >
            <Grid
              autoFlow="column"
              backgroundColor="graylo"
              bordersBottom
              columnGap={10}
              justifyContent="start"
              paddingBottom={18}
              paddingLeft={PADDING_HORIZONTAL}
              paddingRight={PADDING_HORIZONTAL}
              paddingTop={18}
              templateColumns="1fr auto"
              templateRows="auto"
            >
              <Grid
                autoFlow="column"
                columnGap={PADDING_HORIZONTAL}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <DiamondShared {...iconProps} colorName="yellow" />}
                  basic
                  grouped="true"
                  onClick={event => alert('DiamondShared')}
                  small
                />
                <TooltipWrapper
                  tooltip={
                    <Grid rowGap={PADDING_HORIZONTAL / 2}>
                      <Button
                        asLink
                        onClick={event => alert('Edit')}
                      >
                        <Text monospace small>
                          {block?.configuration?.file_source?.path}
                        </Text>
                      </Button>
                    </Grid  >
                  }
                >
                  <Text monospace secondary small>
                    {block?.name ?? block?.uuid}
                  </Text >
                </TooltipWrapper>
              </Grid >
              {toolbars?.top}

              <Grid
                autoFlow="column"
                columnGap={PADDING_HORIZONTAL * 2}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <IdentityTag {...iconProps} secondary />}
                  basic
                  grouped="true"
                  onClick={event => alert('IdentityTag')}
                  small
                />

                <Button
                  Icon={iconProps => <AppVersions {...iconProps} secondary />}
                  basic
                  grouped="true"
                  onClick={event => alert('AppVersions')}
                  small
                />
              </Grid>
            </Grid>

            <Grid className={styles.codeContainer}>
              <EditorContainerStyled>
                {main}
              </EditorContainerStyled>
            </Grid>
          </Grid>

          {stale && (
            <Grid
              borders
              padding={16}
            >
              <div style={{
                maxWidth: 300,
              }}>
                <Text muted xsmall>
                  Content was last saved <Text inline xsmall warning>{lastModified}</Text> and the server content
                  is different from the current local content.
                  Save the current content or reset it
                  with the server content.
                </Text>

                <br />

                <ButtonGroup>
                  <Button asLink onClick={() => overrideServerContentFromLocal()} wrap>
                    <Text blue underline xsmall>
                      Save local
                    </Text >
                  </Button>

                  <Button
                    asLink
                    onClick={event => {
                      event.preventDefault();
                      overrideLocalContentFromServer();
                    }}
                    wrap
                  >
                    <Text muted underline xsmall>
                      Restore local content from server
                    </Text >
                  </Button>
                </ButtonGroup>
              </div>

            </Grid>
          )}

          <Grid ref={containerRef} rowGap={8} />
        </Grid>
      </div >
    </NodeWrapper>
  );
}

function areEqual(p1: DraggableAppNodeProps, p2: DraggableAppNodeProps) {
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  DEBUG.editor.node && console.log('DraggableAppNode.areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
