import IDEThemeType, { IDEThemeEnum, ModeEnumToThemeEnum } from './themes/interfaces';
import baseConfigurations from './configurations/base';
import baseDiffConfigurations from './configurations/diff';
import buildThemes from './themes';
import initializeAutocomplete from './autocomplete';
import pythonConfiguration, { pythonLanguageExtension } from './languages/python/configuration';
import pythonProvider from './languages/python/provider';
import { FileType, ResourceType } from './interfaces';
import { LanguageEnum } from './languages/constants';
import { ModeEnum } from '@mana/themes/modes';
import { getHost } from '@api/utils/url';
import { getTheme, getThemeSettings } from '@mana/themes/utils';
import { languageClientConfig, loggerConfig } from './constants';
import { DEBUG } from '../utils/debug';

function debugLog(message: any, args?: any | any[]) {
  const arr = [`[EditorManager] ${message}`];
  if (Array.isArray(args)) {
    arr.push(...args);
  } else if (args) {
    arr.push(args);
  }
  DEBUG.editor.manager && console.log(...arr);
}

type onComplete = (
  wrapper?: any,
  languageServerClient?: any,
  languageClient?: any,
  files?: FileType[],
) => void;

type InitializeWrapperProps = {
  onComplete?: onComplete;
  options?: {
    configurations?: any;
    theme?: IDEThemeEnum;
  };
};

type InitializeLanguageServerProps = {
  enabled?: boolean;
  onComplete?: onComplete;
};

type InitializeWorkspaceProps = {
  onComplete?: onComplete;
  options?: {
    fetch?: (callback: (files: FileType[]) => void, query?: Record<string, any>) => void;
  };
};

export type InitializeProps = {
  languageServer?: InitializeLanguageServerProps;
  resource: ResourceType;
  workspace?: InitializeWorkspaceProps;
  wrapper?: InitializeWrapperProps;
};

class Manager {
  private static instances: Record<string, Manager>;
  private static languageServers: Record<string, any>;
  private static resources: Record<
    string,
    {
      resource: ResourceType;
      uuid: string;
    }
  > = {};
  private static servicesLoaded: boolean = false;
  private static registeredFiles: Record<string, FileType> = {};

  private files: FileType[] = null;
  private language: LanguageEnum = null;
  private languageClient: any = null;
  private languageServerClientWrapper: any = null;
  private monaco: any = null;
  private onCompletions: {
    languageServer?: onComplete;
    workspace?: onComplete;
    wrapper?: onComplete;
  } = {};
  private requiresNewModel: boolean = false;
  private resource: ResourceType = {
    main: null,
    original: null,
  };
  private completions: {
    languageServer?: boolean[];
    workspace?: boolean[];
    wrapper?: boolean[];
  } = {
    languageServer: [],
    workspace: [],
    wrapper: [],
  };
  private timeout: any = null;
  private uuid: string = null;
  private wrapper: any | null = null;

  public constructor(uuid: string) {
    this.uuid = uuid;
  }

  public static async loadServices() {
    if (Manager.servicesLoaded) {
      return;
    }

    debugLog('Loading services...');

    const monaco = await import('monaco-editor');
    await import('monaco-editor-wrapper');
    const { useWorkerFactory } = await import('monaco-editor-wrapper/workerFactory');
    await import('@codingame/monaco-vscode-python-default-extension');

    const configureMonacoWorkers = async () => {
      useWorkerFactory({
        ignoreMapping: true,
        workerLoaders: {
          editorWorkerService: () =>
            new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
              type: 'module',
            }),
          javascript: () =>
            // @ts-ignore
            import('monaco-editor-wrapper/workers/module/ts').then(
              module => new Worker(module.default, { type: 'module' }),
            ),
        },
      });

      Manager.servicesLoaded = true;
      debugLog('Services loaded.');
    };

    await configureMonacoWorkers();

    monaco.languages.setLanguageConfiguration(
      pythonLanguageExtension.id,
      // @ts-ignore
      pythonConfiguration(),
    );

    initializeAutocomplete(monaco, LanguageEnum.PYTHON);
  }

  // https://github.com/TypeFox/monaco-languageclient/blob/main/packages/wrapper/src/wrapper.ts
  public static getInstance(uuid: string): Manager {
    if (!(uuid ?? false)) {
      console.error(
        '[WARNING] Editor manager is being initialized without a UUID, ' +
          'you must use a UUID or else the same instance will be reused.',
      );
    }
    debugLog(Manager.instances);

    if (!Manager.instances) {
      Manager.instances = {};
    }

    const instancesUnused = {};

    debugLog(
      `Instances (${Object.keys(Manager.instances || {}).length}):`,
      Object.keys(Manager.instances || {}),
    );

    Object.entries(Manager.instances).forEach(([key, manager]) => {
      const resource = manager?.resource;
      const path = resource?.main?.path || resource?.original?.path;
      const used = Manager.isResourceOpen(path);

      // debugLog(`  Instance: ${key}`);
      // debugLog(`    - Initialized: ${manager?.isInitialized()}`);
      // debugLog(`    - In use:      ${used}`);
      // debugLog(`    - Resource:    ${path}`);

      if (!used) {
        instancesUnused[key] = manager;
      }
    });

    const unusedCount = Object.keys(instancesUnused).length;
    if (unusedCount >= 1) {
      debugLog(`Unused instances (${unusedCount}):`, Object.keys(instancesUnused || {}));

      const uuidUnused = Object.keys(instancesUnused)[0];
      debugLog(`Reusing unused instance ${uuidUnused}...`);

      const instances = {};
      Object.entries(Manager.instances).forEach(([key, value]) => {
        instances[key === uuidUnused ? uuid : key] = value;
      });
      Manager.instances = instances;
    } else if (!(uuid in Manager.instances)) {
      debugLog(`Constructing new instance ${uuid}...`);
      Manager.instances[uuid] = new Manager(uuid);
    }

    return Manager.instances[uuid];
  }

  public static isResourceOpen(path: string): boolean {
    return path in (Manager.resources || {});
  }

  public static setValue(file: FileType) {
    const { content, path } = file;
    const obj = Manager.resources[path];
    if (obj) {
      const { resource, uuid } = obj;
      if (uuid in (Manager.instances || {})) {
        const editor = Manager.instances[uuid]?.getEditor();
        if (editor) {
          editor?.setValue(content);
          Manager.resources[path] = {
            ...obj,
            resource: {
              ...resource,
              main: {
                ...(resource?.main || {}),
                content,
              } as FileType,
            },
          };
        }
      }
    } else {
      console.error(`No resource found for ${path}`, file);
      debugLog('Current resources:', Manager.resources);
    }
  }

  public static dispose() {
    if (Manager.instances) {
      Object.values(Manager?.instances || {}).forEach(instance => {
        instance.dispose(true);
      });
      Manager.instances = null;
      Manager.languageServers = null;
      Manager.resources = {};
    }
  }

  public getMonaco() {
    return this.monaco;
  }

  public getEditor() {
    return this.wrapper?.getEditor() || this.wrapper.getDiffEditor();
  }

  public getDiffEditor() {
    return this.wrapper.getDiffEditor();
  }

  public isUsingDiffEditor(): boolean {
    return this.wrapper.getMonacoEditorApp().config.useDiffEditor;
  }

  public async dispose(shutdown?: boolean) {
    this.closeResource();

    if (this.wrapper) {
      if (shutdown) {
        debugLog(`Shutting down manager ${this.uuid}...`);
        await this.wrapper.dispose();
        if (Manager.instances && this.uuid in Manager.instances) {
          delete Manager.instances[this.uuid];
        }
      } else {
        debugLog(`Disposing editor ${this.uuid}...`);
        await this.wrapper.getMonacoEditorApp().disposeApp();
      }
    }
  }

  public closeResource() {
    const path = this.resource?.main?.path || this.resource?.original?.path;
    debugLog(`Closing resource: ${path}`);
    const resources = Object.keys(Manager.resources).length;
    delete Manager.resources[path];
    const open = Object.keys(Manager.resources).length;
    debugLog(`Resources open: ${open} (${open - resources} changed)`);
  }

  public getWrapper() {
    return this.wrapper;
  }

  public isInitialized(): boolean {
    return this.getWrapper()?.isInitDone();
  }

  public isStarted(): boolean {
    return this.getWrapper()?.isStarted();
  }

  private getThemes(mode?: ModeEnum): Record<IDEThemeEnum, IDEThemeType> {
    const themes = buildThemes(getThemeSettings()?.theme);
    return mode ? themes[ModeEnumToThemeEnum[mode]] : themes;
  }

  public async start(element: HTMLElement) {
    await this.wrapper.start(element);
    const monacoEditor = this.monaco.editor;
    Object.entries(this.getThemes()).forEach(([key, value]) => {
      monacoEditor.defineTheme(key, value);
    });

    if (this.requiresNewModel) {
      debugLog(`Creating new model for resource: ${this.resource.main.path}`);
      await this.wrapper.updateCodeResources(this.buildCodeResources(this.resource));
    }
  }

  public async initialize(resource: ResourceType, opts?: InitializeProps) {
    const { languageServer, workspace, wrapper } = opts || {};

    if (this.isInitialized()) {
      this.requiresNewModel = this.resource
        ? this.resource?.main?.path !== resource?.main?.path
        : false;
      this.updateResource(resource);

      [wrapper, languageServer, workspace].map(configs => configs?.onComplete?.());

      return;
    }

    this.updateResource(resource);
    this.monaco = await import('monaco-editor');
    await Manager.loadServices();

    this.onCompletions.wrapper = () => wrapper?.onComplete?.();
    this.onCompletions.languageServer = () =>
      !languageServer?.enabled || languageServer?.onComplete?.();
    this.onCompletions.workspace = () => workspace?.onComplete?.();

    await this.initializeWrapper(
      {
        ...wrapper,
        languageServer,
      },
      async (languageServerClientWrapper: any) =>
        await this.startLanguageServer(
          languageServerClientWrapper,
          async (languageClient: any) => await this.initializeWorkspace(languageClient, workspace),
          languageServer,
        ),
    );
    await this.isCompleted();
  }

  private updateResource(resource: ResourceType) {
    const { main, original } = resource;

    this.language = main?.language;
    this.resource = resource;
    Manager.resources[main?.path || original?.path] = {
      resource,
      uuid: this.uuid,
    };
  }

  private async isCompleted() {
    const watch = () => {
      clearTimeout(this.timeout);

      Object.entries(this.onCompletions || {}).forEach(([key, onComplete]) => {
        const [completed, completionRan] = this.completions[key] || [false, false];

        if (completed && !completionRan && onComplete) {
          onComplete?.(
            this.wrapper,
            this.languageServerClientWrapper,
            this.languageClient,
            this.files,
          );
        }
        this.completions[key] = [completed, true];
      });
      if (Object.values(this.completions || {})?.every(arr => arr?.every(v => v))) {
        this.timeout = null;
      } else {
        this.timeout = setTimeout(watch, 1000);
      }
    };

    this.timeout = setTimeout(watch, 1000);
  }

  private async initializeWrapper(
    opts: InitializeWrapperProps & { languageServer?: InitializeLanguageServerProps },
    callback: (languageServerClientWrapper: any) => void,
  ) {
    const { languageServer, options } = opts || {};

    const { MonacoEditorLanguageClientWrapper } = await import('monaco-editor-wrapper');

    try {
      const wrapper = new MonacoEditorLanguageClientWrapper();
      const configurations = baseConfigurations(getTheme(), {
        ...options?.configurations,
        theme: options?.theme,
      });

      const diffConfigurations = baseDiffConfigurations(getTheme(), {
        ...options?.configurations,
        theme: options?.theme,
      });

      const configs = await this.buildUserConfig(
        configurations,
        diffConfigurations,
        languageServer,
      );
      await wrapper.init(configs as any);
      this.wrapper = wrapper;
      callback(wrapper?.getLanguageClientWrapper());
      this.completions.wrapper = [true, false];
    } catch (error) {
      console.error('[ERROR] IDE: error while initializing Monaco editor:', error);
    }

    return this.wrapper;
  }
  private async startLanguageServer(
    languageServerClientWrapper: any,
    callback: (languageClient: any) => void,
    languageServer: InitializeLanguageServerProps,
  ) {
    this.languageServerClientWrapper = languageServerClientWrapper;

    if (languageServer?.enabled && this.isLanguageServerEnabled()) {
      if (this.isLanguageServerInitialized()) {
        this.languageClient = Manager.languageServers?.[this.language];
        debugLog(`LSP: ${this.language} already started, skipping...`);
      } else {
        await languageServerClientWrapper.start().then(() => {
          this.languageClient = languageServerClientWrapper.getLanguageClient();
          Manager.languageServers[this.language] = this.languageClient;
          debugLog(`LSP: ${this.language} starting...`);
        });
      }
    }

    const lsps = Object.keys(Manager.languageServers ?? {});
    debugLog(`LSPs (${lsps?.length || 0}): ${lsps?.join(', ')}`);

    this.completions.languageServer = [true, false];
    callback(this.languageClient);
  }

  private async initializeWorkspace(languageClient: any, opts?: InitializeWorkspaceProps) {
    // const { options } = opts || {};
    // const { fetch } = options || {};

    // TODO (dangerous): use server stream events
    // const managerLanguage = this.language;
    // if (fetch) {
    //   function registerItem(file: FileType) {
    //     const { content, language, modified_timestamp: version, path } = file;

    //     if (managerLanguage === language && !(path in Manager.registeredFiles)) {
    //       languageClient?.sendNotification('textDocument/didOpen', {
    //         textDocument: {
    //           languageId: language,
    //           text: content || '',
    //           uri: `file://${path}`,
    //           version,
    //         },
    //       });
    //       Manager.registeredFiles[path] = file;
    //     }
    //   }

    //   fetch((files: FileType[]) => {
    //     files.forEach(registerItem);
    //     this.files = files;
    //   });

    //   if (isDebug()) {
    //     fetch((files: FileType[]) => {
    //       files.forEach(registerItem);
    //       debugLog(`[DEBUG] Registered ${files?.length} from /home/src`);
    //     }, {
    //       paths: [
    //         '/home/src/mage_ai/ai',
    //         '/home/src/mage_ai/api',
    //         '/home/src/mage_ai/authentication',
    //         '/home/src/mage_ai/autocomplete',
    //         '/home/src/mage_ai/cache',
    //         '/home/src/mage_ai/cli',
    //         '/home/src/mage_ai/cluster_manager',
    //         '/home/src/mage_ai/command_center',
    //         '/home/src/mage_ai/data',
    //         '/home/src/mage_ai/data_cleaner',
    //         '/home/src/mage_ai/data_integrations',
    //         '/home/src/mage_ai/data_preparation',
    //         '/home/src/mage_ai/docs',
    //         '/home/src/mage_ai/errors',
    //         '/home/src/mage_ai/extensions',
    //         '/home/src/mage_ai/io',
    //         '/home/src/mage_ai/kernels',
    //         '/home/src/mage_ai/orchestration',
    //         '/home/src/mage_ai/presenters',
    //         '/home/src/mage_ai/sample_datasets',
    //         '/home/src/mage_ai/server',
    //         '/home/src/mage_ai/services',
    //         '/home/src/mage_ai/settings',
    //         '/home/src/mage_ai/shared',
    //         '/home/src/mage_ai/streaming',
    //         '/home/src/mage_ai/system',
    //         '/home/src/mage_ai/tests',
    //         '/home/src/mage_ai/usage_statistics',
    //         '/home/src/mage_ai/utils',
    //         '/home/src/mage_ai/version_control',
    //         ].join(','),
    //     });
    //   }
    // }
    //

    this.files = [];
    this.completions.workspace = [true, false];
  }

  private async getLanguageDef() {
    const { mode } = getThemeSettings();
    const configUri = new URL('./languages/python/config.json', import.meta.url).href;

    return {
      languageExtensionConfig: {
        ...pythonLanguageExtension,
        configuration: this.monaco.Uri.parse(
          `${getHost({
            forceCurrentPort: true,
          })}${configUri}`,
        ),
      },
      monarchLanguage: pythonProvider(),
      theme: {
        data: this.getThemes(mode),
        name: ModeEnumToThemeEnum[mode],
      },
    };
  }

  private isLanguageServerEnabled(): boolean {
    return [LanguageEnum.PYTHON].includes(this.language);
  }

  private isLanguageServerInitialized(): boolean {
    Manager.languageServers = Manager.languageServers || {};
    return this.language in Manager.languageServers;
  }

  private buildCodeResources(resource: ResourceType) {
    return Object.entries(resource).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: {
          // enforceLanguageId: value?.language,
          fileExt: value?.extension,
          text: value?.content || '',
          uri: this.monaco.Uri.parse(`file://${value?.path}`),
        },
      }),
      {},
    );
  }

  private async buildUserConfig(
    configurations: any,
    diffConfigurations?: any,
    languageServer?: InitializeLanguageServerProps,
  ) {
    const { main, original } = this.resource;
    const useDiffEditor = main && original && main?.content !== original?.content;

    return {
      id: this.uuid,
      languageClientConfig:
        !languageServer?.enabled || this.isLanguageServerInitialized()
          ? null
          : {
              ...languageClientConfig,
              languageId: this.language,
              name: `mage-lsp-${this.language}`,
            },
      loggerConfig,
      wrapperConfig: {
        editorAppConfig: {
          $type: 'classic' as const,
          codeResources: this.buildCodeResources(this.resource),
          diffEditorOptions: useDiffEditor ? diffConfigurations : undefined,
          domReadOnly: true,
          editorOptions: configurations,
          languageDef: await this.getLanguageDef(),
          useDiffEditor,
        },
      },
    };
  }
}

export { Manager };

export default Manager;
