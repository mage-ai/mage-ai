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
  private static languageServersStarted: Record<string, boolean> = {};
  private static resources: Record<string, {
    resource: ResourceType;
    uuid: string;
  }> = {};
  // private static registeredFiles: Record<string, FileType> = {};
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

  // https://github.com/TypeFox/monaco-languageclient/blob/main/packages/wrapper/src/wrapper.ts
  public static getInstance(uuid: string): Manager {
    if (!Manager.instances) {
      Manager.instances = {};
    }

    if (!(uuid in Manager.instances)) {
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
        Manager.instances[uuid].getEditor().setValue(content);
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
  }

  public static dispose() {
    if (Manager.instances) {
      Object.values(Manager?.instances || {}).forEach((instance) => {
        instance.dispose(true);
      });
    }
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
        console.log(`Shutting down manager ${this.uuid}...`);
        await this.wrapper.dispose();
        delete Manager.instances[this.uuid];
      } else {
        console.log(`Disposing editor ${this.uuid}...`);
        await this.wrapper.getMonacoEditorApp().disposeApp();
      }
    }
  }

  public closeResource() {
    const path = this.resource?.main?.path || this.resource?.original?.path;
    console.log(`Closing resource: ${path}`);
    const resources = Object.keys(Manager.resources).length;
    delete Manager.resources[path];
    const open = Object.keys(Manager.resources).length;
    console.log(`Resources open: ${open} (${open - resources} changed)`);
  }

  public getWrapper() {
    return this.wrapper;
  }

  private getThemes(mode?: ModeEnum): Record<IDEThemeEnum, IDEThemeType> {
    const themes = buildThemes(getThemeSettings()?.theme);
    return mode ? themes[ModeEnumToThemeEnum[mode]] : themes;
  }

  public async start(element: HTMLElement) {
    await this.wrapper.start(element);
    const editor = this.getMonaco()?.editor;
    Object.entries(this.getThemes()).forEach(([key, value]) => {
      editor.defineTheme(key, value);
    });
  }

  public async initialize(resource: ResourceType, opts?: InitializeProps) {
    const { languageServer, workspace, wrapper } = opts || {};
    const { main, original } = resource;

    this.language = main?.language;
    this.resource = resource;
    Manager.resources[main?.path || original?.path] = {
      resource,
      uuid: this.uuid,
    };

    await this.loadMonaco();
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
    };

    await configureMonacoWorkers();
    await this.setupPythonLanguage();
    await this.setupAutocomplete();

    this.onCompletions.wrapper = () => wrapper?.onComplete?.();
    this.onCompletions.languageServer = () => languageServer?.onComplete?.();
    this.onCompletions.workspace = () => workspace?.onComplete?.();

    await this.initializeWrapper(
      wrapper,
      async (languageServerClientWrapper: any) =>
        await this.startLanguageServer(
          languageServerClientWrapper,
          languageServer,
          async (languageClient: any) => await this.initializeWorkspace(languageClient, workspace),
        ),
    );
    await this.isCompleted();
  }

  public getMonaco() {
    return this.monaco;
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
    opts: InitializeWrapperProps,
    callback: (languageServerClientWrapper: any) => void,
  ) {
    const { options } = opts || {};

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

      const configs = await this.buildUserConfig(configurations, diffConfigurations);
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
    opts: InitializeLanguageServerProps,
    callback: (languageClient: any) => void,
  ) {
    this.languageServerClientWrapper = languageServerClientWrapper;
    if (!this.languageClient) {
      this.languageClient = languageServerClientWrapper.getLanguageClient();
    }
    callback(this.languageClient);
    this.completions.languageServer = [true, false];
  }

  private async initializeWorkspace(languageClient: any, opts?: InitializeWorkspaceProps) {
    const { options } = opts || {};
    const { fetch } = options || {};

    const managerLanguage = this.language;

    if (languageClient && !(managerLanguage in Manager.languageServersStarted)) {
      Manager.languageServersStarted[managerLanguage] = languageClient;
    }

    // TODO (dangerous): use server stream events
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
    //       console.log(`[DEBUG] Registered ${files?.length} from /home/src`);
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

  private isLanguageServerEnabled(): boolean {
    return [LanguageEnum.PYTHON].includes(this.language);
  }

  public async loadMonaco() {
    this.monaco = await import('monaco-editor');
    return this.monaco;
  }

  public async loadServices() {
    await import('@codingame/monaco-vscode-python-default-extension');
  }

  private async getLanguageDef() {
    const { mode } = getThemeSettings();

    return {
      languageExtensionConfig: await this.getPythonLanguageExtensionWithURI(),
      monarchLanguage: pythonProvider(),
      theme: {
        data: this.getThemes(mode),
        name: ModeEnumToThemeEnum[mode],
      },
    };
  }

  private async getPythonLanguageExtensionWithURI() {
    const configUri = new URL('./languages/python/config.json', import.meta.url).href;
    return {
      ...pythonLanguageExtension,
      configuration: (await this.loadMonaco()).Uri.parse(
        `${getHost({
          forceCurrentPort: true,
        })}${configUri}`,
      ),
    };
  }

  public async setupAutocomplete() {
    initializeAutocomplete(await this.loadMonaco(), LanguageEnum.PYTHON);
  }

  public async setupPythonLanguage() {
    if (!this.isLanguageServerEnabled()) {
      return;
    }

    (await this.loadMonaco()).languages.register(await this.getPythonLanguageExtensionWithURI());
    (await this.loadMonaco()).languages.setLanguageConfiguration(
      pythonLanguageExtension.id,
      // @ts-ignore
      pythonConfiguration(),
    );
  }

  private async buildUserConfig(configurations: any, diffConfigurations?: any) {
    let languageServerConfig = {
      ...languageClientConfig,
      languageId: this.language,
      name: `mage-lsp-${this.language}`,
    };

    if (this.language in Manager.languageServersStarted) {
      languageServerConfig = null;
      this.languageClient = Manager.languageServersStarted?.[this.language];
      console.log(`Language server for language ${this.language} already started, skipping...`);
    }

    const monaco = await this.loadMonaco();

    const { main, original } = this.resource;
    const useDiffEditor = main && original && main?.content !== original?.content;
    const codeResources = Object.entries(this.resource).reduce((acc, [key, value], idx: number) => ({
      ...acc,
      [key]: {
        // enforceLanguageId: value?.language,
        fileExt: value?.extension,
        text: value?.content || '',
        uri: monaco.Uri.parse(`file://${value?.path}`),
      },
    }), {});

    return {
      id: this.uuid,
      languageClientConfig: languageServerConfig,
      loggerConfig,
      wrapperConfig: {
        editorAppConfig: {
          $type: 'classic' as const,
          codeResources,
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
