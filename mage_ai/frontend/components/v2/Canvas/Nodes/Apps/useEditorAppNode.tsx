import Button from '@mana/elements/Button';
import { ElementRoleEnum } from '@mana/shared/types';
import EventStreamType from '@interfaces/EventStreamType';
import Grid from '@mana/components/Grid';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import TextInput from '@mana/elements/Input/TextInput';
import colors from '@mana/themes/colors';
import moment from 'moment';
import stylesAppNode from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import stylesEditor from '@styles/scss/components/Canvas/Nodes/Apps/Editor.module.scss';
import useApp from '../../../Apps/Editor/useApp';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { ClientEventType } from '@mana/shared/interfaces';
import { EditorContainerStyled } from './index.style';
import { KEY_ENTER, KEY_CODE_META, KEY_ESCAPE } from '@utils/hooks/keyboardShortcuts/constants';
import { OutputGroupsType } from '../CodeExecution/OutputGroups';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';
import { contrastRatio } from '@utils/colors';
import { convertToMillisecondsTimestamp } from '@utils/date';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { getFileCache, isStale, updateFileCache } from '../../../IDE/cache';
import { Save, DeleteCircle, CloseV2, PlayButton } from '@mana/icons';
import BlockType from '@interfaces/BlockType';
import { getBlockColor } from '@mana/themes/blocks';
import { FileType } from '@components/v2/IDE/interfaces';
import { AppNodeType } from '../../interfaces';

const PADDING_HORIZONTAL = 16;

export type EditorAppNodeProps = {
  app?: AppNodeType;
  block?: BlockType;
  containerRef?: React.RefObject<HTMLElement | undefined> | undefined;
  dragControls?: any;
  dragDisabled?: boolean;
  fileRef?: React.MutableRefObject<FileType | undefined> | undefined;
  height?: number;
  handleContextMenu?: (event: ClientEventType) => void;
  onMount?: () => void;
  outputGroupsProps?: OutputGroupsType;
  interruptExecution?: (opts?: { onError?: () => void; onSuccess?: () => void }) => void;
  setHandleOnMessage?: (appId: string, handleOnMessage: (event: EventStreamType) => void) => void;
  skipInitialFetch?: boolean;
  submitCodeExecution?: (
    event: any,
    opts?: {
      onError?: () => void;
      onSuccess?: () => void;
    },
  ) => void;
  onClose?: () => void;
  width?: number;
};

export default function useEditorAppNode({
  app,
  block,
  containerRef,
  dragDisabled,
  fileRef,
  handleContextMenu,
  height,
  interruptExecution,
  outputGroupsProps,
  onClose,
  onMount,
  setHandleOnMessage,
  skipInitialFetch = true,
  submitCodeExecution,
  width,
}: EditorAppNodeProps & OutputGroupsType) {
  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [loadingKernelMutation, setLoadingKernelMutation] = useState<boolean>(false);
  const [afterOpen, setAfterOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveStatusRef = useRef<HTMLElement>(null);

  const { configuration } = block ?? {};
  const file = useMemo(() => (fileRef?.current ?? configuration?.file) ?? {
    ...configuration?.file_source,
    path: configuration?.file_path,
  }, [configuration]);
  const [stale, setStale] = useState(isStale(file?.path));

  useEffect(() => {
    onMount && onMount?.();

    setHandleOnMessage &&
      setHandleOnMessage?.(app.id, (event: EventStreamType) => {
        const done = executionDone(event);
        setExecuting(!done);
      });
  }, [onMount, setExecuting]);

  const appOptions = {
    configurations: {
      // dimension: DEFAULT_RECT,
      folding: true,
      glyphMargin: true,
      // lineDecorationsWidth: PADDING_HORIZONTAL,
      lineNumbers: 'on',
      // lineNumbersMinChars: 0,
    },
    file,
  };
  const { main, toolbars } = useApp({
    app: {
      options: appOptions,
      subtype: AppSubtypeEnum.CANVAS as AppSubtypeEnum,
      type: AppTypeEnum.EDITOR as AppTypeEnum,
      uuid: [
        block?.uuid ?? file?.path,
        AppTypeEnum.EDITOR,
        AppSubtypeEnum.CANVAS,
      ].join(':'),
      ...app,
    },
    actions: {
      ...(submitCodeExecution ? {
        executeCode: () => {
          setLoading(true);
          submitCodeExecution(null, {
            onError: () => setLoading(false),
            onSuccess: () => setLoading(false),
          });
        }
      } : {}),
      ...(interruptExecution ? {
        interruptCodeExecution: () => {
          setLoadingKernelMutation(true);
          interruptExecution({
            onError: () => {
              setExecuting(false);
              setLoadingKernelMutation(false);
            },
            onSuccess: () => setLoadingKernelMutation(false),
          });
        }
      } : {}),
      saveContent: () => {
        saveContent(null);
      },
    },
    editor: {
      containerClassName: [stylesEditor.editorContainer].filter(Boolean).join(' '),
      editorClassName: [stylesEditor.editorMain].filter(Boolean).join(' '),
      eventListeners: {
        onDidChangeModelContent: () => {
          setStale(isStale(file?.path));
        },
        onMouseDown: (editor: any, { event }) => {
          event.stopPropagation();
        },
      },
      persistResourceOnUnmount: true,
      style: {},
    },
    onMountEditor: () => {
      if (containerRef?.current) {
        // This is required or else a preview of the node won’t be available when dragging.
        containerRef.current.style.opacity = '1';
        containerRef.current.style.visibility = 'visible';
        containerRef.current.style.display = 'block';
      }
    },
    skipInitialFetch,
    useToolbars: true,
  });
  const {
    original,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
  } = toolbars ?? ({} as any);

  function saveContent(event?: any) {
    setSaving(true);
    saveCurrentContent(null, {
      onError: () => {
        setSaving(false);
      },
      onSuccess: ({ data: { browser_item: model } }) => {
        updateFileCache({ client: model, server: model });
        setStale(isStale(model?.path));
        setSaving(false);
      },
    });
  }

  const colorNames = getBlockColor(block?.type, { getColorName: true })?.names;
  const baseColor = colorNames?.base;
  const baseColorHex = colors?.[baseColor]?.dark;
  const contrastColorName =
    contrastRatio(baseColorHex, colors?.white?.dark) < 4.5 ? 'black' : 'white';
  const lastModified = useMemo(() => {
    if (original?.modified_timestamp) {
      return moment(convertToMillisecondsTimestamp(original?.modified_timestamp ?? 0)).fromNow();
    }
  }, [original?.modified_timestamp]);

  function startDrag(event: any) {
    // console.log('startDrag', event, dragControls, dragControls?.start);
    // dragControls?.start(event);
  }

  function cancelDrag(event: any) {
    // console.log('CANCEL', event);
    !dragDisabled && event.stopPropagation();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subheaderItems = useMemo(() => [
    // {
    //   Icon: Save,
    //   description: stale
    //     ? `You have unsaved changes. Content was modified ${lastModified}.`
    //     : 'Save current file content.',
    //   iconProps: stale ? { color: 'var(--colors-statuses-warning)' } : {},
    //   loading: saving,
    //   onClick: saveContent,
    //   uuid: 'Save',
    // },
    // {
    //   Icon: Conversation,
    //   uuid: 'Chat',
    //   description: 'Get support in the community channel on Slack',
    //   href: 'https://mage.ai/chat', target: '_blank', anchor: 'true',
    // },
    // {
    //   Icon: Comment,
    //   description: 'Add a comment to the pipeline or for a specific block',
    //   uuid: 'Comment',
    //   onClick: event => alert('Comment'),
    // },
    // {
    //   Icon: CloseV2,
    //   description: 'Close app',
    //   uuid: 'Close',
    //   onClick: onClose,
    // },
  ], []);

  const toolbarTopMemo = (
    <Grid
      alignItems="center"
      columnGap={PADDING_HORIZONTAL / 2}
      justifyContent="space-between"
      onPointerDownCapture={cancelDrag}
      templateColumns={[
        '1fr',
        onClose && 'auto',
      ].filter(Boolean).join(' ')}
      templateRows="1fr"
    >
      {/* <Button
        Icon={asideBeforeOpen ? PanelCollapseLeft : BlockGenericV2}
        basic={asideBeforeOpen}
        onClick={() => setAsideBeforeOpen(prev => !prev)}
        small
      /> */}

      <Grid
        alignItems="center"
        autoFlow="column"
        columnGap={PADDING_HORIZONTAL / 2}
        justifyContent="start"
        templateRows="1fr"
      >
        {submitCodeExecution && (
          <div style={{ position: 'relative' }}>
            {executing && <Tag left statusVariant timer top />}
            <Button
              Icon={ip => executing
                ? <DeleteCircle {...ip} colorName={baseColor} />
                : <PlayButton {...ip} colorName={contrastColorName} />
              }
              backgroundcolor={!executing ? baseColor : 'transparent'}
              loading={loadingKernelMutation || loading}
              onClick={
                executing
                  ? () => {
                    setLoadingKernelMutation(true);
                    interruptExecution({
                      onError: () => {
                        setExecuting(false);
                        setLoadingKernelMutation(false);
                      },
                      onSuccess: () => setLoadingKernelMutation(false),
                    });
                  }
                  : event => {
                    setLoading(true);
                    submitCodeExecution(event, {
                      onError: () => setLoading(false),
                      onSuccess: () => setLoading(false),
                    });
                  }
              }
              small
              style={{
                borderColor: executing ? `var(--colors-${baseColor})` : 'transparent',
              }}
              tag={!executing &&
                <KeyboardTextGroup
                  colorName={executing ? undefined : contrastColorName}
                  textGroup={[[KEY_CODE_META, executing ? KEY_ESCAPE : KEY_ENTER]]}
                  xsmall
                />
              }
              tagProps={{
                style: {
                  backgroundColor: colors?.[`${contrastColorName}lo`]?.dark,
                },
              }}
            />
          </div>
        )}

        <TooltipWrapper
          align={TooltipAlign.END}
          horizontalDirection={TooltipDirection.DOWN}
          justify={TooltipJustify.END}
          tooltip={
            <Text secondary small>
              You have unsaved changes. Content was modified {lastModified}.
              Save current file content.

            </Text>
          }
        >
          <Button
            Icon={ip => <Save {...ip} color={stale ? 'var(--colors-statuses-warning)' : undefined} />}
            data-loading-style="inline"
            loading={saving}
            onClick={saveContent}
            small
            basic
          />
        </TooltipWrapper>

        {stale && getFileCache(file?.path)?.client?.cachedAt && (
          <Text monospace muted xsmall warning>
            Last saved {moment(getFileCache(file?.path)?.client?.cachedAt).fromNow()}
          </Text>
        )}
      </Grid>

      {/* <TextInput basic placeholder="/" style={{ paddingBottom: 8, paddingTop: 8 }} /> */}

      {onClose && (
        <Button
          // Icon={afterOpen ? PanelCollapseRight : Menu}
          // basic={afterOpen}
          // onClick={() => setAfterOpen(prev => !prev)}
          Icon={CloseV2}
          basic
          onClick={() => onClose()}
          small
        />
      )}
    </Grid>
  );

  const subheaderMemo = (
    <Grid
      autoFlow="column"
      bordersBottom
      columnGap={10}
      justifyContent="start"
      onPointerDown={dragDisabled ? undefined : startDrag}
      paddingBottom={18}
      paddingLeft={PADDING_HORIZONTAL}
      paddingRight={PADDING_HORIZONTAL}
      paddingTop={18}
      style={{
        backgroundColor: 'var(--menus-background-contained-default)',
      }}
      templateColumns="1fr auto"
      templateRows="auto"
    >
      <Grid
        autoFlow="column"
        columnGap={PADDING_HORIZONTAL}
        justifyContent="start"
        templateRows="auto"
      >
        {/* <Button
          Icon={iconProps => <DiamondShared {...iconProps} colorName="yellow" />}
          basic
          grouped="true"
          onClick={event => alert('DiamondShared')}
          small
        /> */}
        {block && (
          <TooltipWrapper
            align={TooltipAlign.END}
            horizontalDirection={TooltipDirection.DOWN}
            justify={TooltipJustify.END}
            tooltip={
              <Grid rowGap={PADDING_HORIZONTAL / 2}>
                <Button asLink onClick={event => alert('Edit')}>
                  <Text monospace small>
                    {file?.path ?? block?.configuration?.file_source?.path}
                  </Text>
                </Button>
              </Grid>
            }
          >
            <Text monospace={!block?.name} medium small>
              {block?.name ?? block?.uuid ?? file?.path}
            </Text>
          </TooltipWrapper>
        )}
        {!block && (
          <Text monospace small>
            {file?.path}
          </Text>
        )}
      </Grid>

      {toolbars?.top}

      <Grid
        autoFlow="column"
        columnGap={PADDING_HORIZONTAL * 2}
        justifyContent="start"
        templateRows="auto"
      >
        {/* <Button
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
        /> */}
      </Grid>
    </Grid>
  );

  const wrapperMemo = ({
    main: mainApp,
    subheader,
    toolbars: toolbarsApp,
  }: {
    main?: any;
    subheader?: any;
    toolbars?: {
      bottom?: any;
      top?: any;
    };
  }) => (
    <Grid
      className={[stylesAppNode.appNodeContainer].join(' ')}
      height="inherit"
      onContextMenu={(event: any) => handleContextMenu?.(event)}
      role={ElementRoleEnum.CONTENT}
      rowGap={PADDING_HORIZONTAL / 2}
      style={{
        gridTemplateRows: 'auto 1fr',
      }}
      templateColumns="auto"
    >
      {toolbarsApp?.top}

      {subheaderItems?.length > 0 && (
        <Grid
          autoFlow="column"
          alignItems="center"
          borders
          columnGap={12}
          justifyContent="start"
          onPointerDownCapture={cancelDrag}
          padding={6}
          style={{
            backgroundColor: 'var(--menus-background-contained-default)',
          }}
          templateRows="auto"
        >
          {subheaderItems?.map(({ Icon, description, iconProps, label, loading, uuid, onClick }: any) => (
            <TooltipWrapper
              align={TooltipAlign.END}
              horizontalDirection={TooltipDirection.DOWN}
              justify={TooltipJustify.END}
              key={uuid}
              tooltip={
                <Text secondary small>
                  {description ?? uuid}
                </Text>
              }
            >
              <Button
                Icon={ip => <Icon {...{ ...ip, ...iconProps }} />}
                data-loading-style="inline"
                loading={loading}
                onClick={onClick ?? undefined}
                small
                basic
              >
                {label && (
                  <Text medium small>
                    {label?.()}
                  </Text>
                )}
              </Button>
            </TooltipWrapper>
          ))}
        </Grid>
      )}

      <Grid
        style={{ overflow: 'hidden' }}
        className={[
          stylesAppNode.content,
          dragDisabled && stylesAppNode.dragger,
        ].filter(Boolean).join(' ')}
        templateRows="auto 1fr"
      >
        {subheader}

        <Grid
          className={stylesAppNode.codeContainer}
          onPointerDownCapture={cancelDrag}
        >
          <EditorContainerStyled>{mainApp}</EditorContainerStyled>
        </Grid>
      </Grid>
    </Grid>
  );

  return {
    main,
    subheader: subheaderMemo,
    toolbars: {
      top: toolbarTopMemo,
    },
    wrapper: wrapperMemo,
  };
}
