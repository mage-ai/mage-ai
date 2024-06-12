import baseConfigurations from './configurations/base';
import initializeAutocomplete from './autocomplete';
import pythonConfiguration, { pythonLanguageExtension } from './languages/python/configuration';
import pythonProvider from './languages/python/provider';
import themes from './themes';
import { CodeResources, FileType } from './interfaces';
import { IDEThemeEnum } from './themes/interfaces';
import { LanguageEnum } from './languages/constants';
import { getHost } from '@api/utils/url';
import { getTheme } from '@mana/themes/utils';
import { languageClientConfig, loggerConfig } from './constants';
import { mergeDeep } from '@utils/hash';

type onComplete = (wrapper?: any, languageServerClient?: any, languageClient?: any, files?: FileType[]) => void;

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
    fetch?: (callback: (files: FileType[]) => void) => void;
  };
};

export type InitializeProps = {
  file?: FileType;
  languageServer?: InitializeLanguageServerProps;
  workspace?: InitializeWorkspaceProps;
  wrapper?: InitializeWrapperProps;
};

class Manager {
  private static instances: Record<string, Manager>;
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

  public static getInstance(uuid: string): Manager {
    if (!Manager.instances) {
      Manager.instances = {};
    }

    if (!(uuid in Manager.instances)) {
      Manager.instances[uuid] = new Manager(uuid);
    }

    return Manager.instances[uuid];
  }

  public getWrapper() {
    return this.wrapper;
  }

  public async initialize({
    file,
    languageServer,
    workspace,
    wrapper,
  }: InitializeProps) {
    this.language = file?.language;

    this.onCompletions.wrapper = () => wrapper?.onComplete?.();
    this.onCompletions.languageServer = () => languageServer?.onComplete?.();
    this.onCompletions.workspace = () => workspace?.onComplete?.();

    await this.loadMonaco();
    await this.setupPythonLanguage();
    await this.setupAutocomplete();

    await this.loadServices();

    await this.initializeWrapper(
      file,
      wrapper,
      async (languageServerClientWrapper: any) => await this.startLanguageServer(
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

        console.log(key, this.completions, this.languageServerClientWrapper, this.languageClient, this.files);

        if (completed && !completionRan && onComplete) {
          onComplete?.(
            this.wrapper,
            this.languageServerClientWrapper,
            this.languageClient,
            this.files,
          );
        }
        this.completions[key] = [completed, true];

        console.log(key, this.completions, this.languageServerClientWrapper, this.languageClient, this.files);
      });

      if (Object.values(this.completions || {})?.every(arr => arr?.every(v => v))) {
        this.timeout = null;
      } else {
        this.timeout = setTimeout(watch, 1000);
      }
    };

    this.timeout = setTimeout(watch, 1000);
  }

  private async initializeWrapper(file: FileType, opts: InitializeWrapperProps, callback: (languageServerClientWrapper) => void) {
    const { options } = opts || {};

    const { MonacoEditorLanguageClientWrapper } = await import('monaco-editor-wrapper');

    try {
      const wrapper = new MonacoEditorLanguageClientWrapper();
      const configurations = baseConfigurations(getTheme(), {
        ...options?.configurations,
        theme: options?.theme,
      });
      const configs = await this.buildUserConfig(file, configurations);
      await wrapper.init(configs as any);
      this.wrapper = wrapper;
      callback(wrapper?.getLanguageClientWrapper());
      this.completions.wrapper = [true, false];
    } catch (error) {
      console.error('[ERROR] IDE: error while initializing Monaco editor:', error);
    }

    return this.wrapper;
  }
  private async startLanguageServer(languageServerClientWrapper: any, opts: InitializeLanguageServerProps, callback: (languageClient: any) => void) {
    this.languageServerClientWrapper = languageServerClientWrapper;
    this.languageClient = languageServerClientWrapper.getLanguageClient();
    callback(this.languageClient);
    this.completions.languageServer = [true, false];
  }

  private async initializeWorkspace(languageClient: any, opts?: InitializeWorkspaceProps) {
    const { options } = opts || {};
    const { fetch } = options || {};

    if (fetch) {
      fetch((files: FileType[]) => {
        files.forEach((file: FileType) => {
          const { content, language, modified_timestamp: version, path } = file;

          if (this.language === language) {
            languageClient?.sendNotification('textDocument/didOpen', {
              textDocument: {
                languageId: language,
                text: content || '',
                uri: `file://${path}`,
                version,
              },
            });
          }
        });

        console.log('FETCHHHHHHHHHHHHHHHHHHHHHHHHED', this.languageClient, this.files);
        this.files = files;
      });
    }

    this.completions.workspace = [true, false];
  }


  private isLanguageServerEnabled(): boolean {
    return [
      LanguageEnum.PYTHON,
    ].includes(this.language);
  }

  private async loadMonaco() {
    if (!this.monaco) {
      this.monaco = await import('monaco-editor');
    }

    return this.monaco;
  }

  private async loadServices() {
    await import('@codingame/monaco-vscode-python-default-extension');
  }

  private async getLanguageDef() {
    return {
      languageExtensionConfig: await this.getPythonLanguageExtensionWithURI(),
      monarchLanguage: pythonProvider(),
      theme: {
        data: themes[IDEThemeEnum.BASE],
        name: IDEThemeEnum.BASE,
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

  private async setupAutocomplete() {
    initializeAutocomplete(await this.loadMonaco(), LanguageEnum.PYTHON);
  }

  private async setupPythonLanguage() {
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

  private async buildUserConfig(file: FileType, configurations: any) {
    return {
      id: this.uuid,
      languageClientConfig: {
        ...languageClientConfig,
        languageId: this.language,
        // name: `mage-lsp-${this.language}`,
      },
      loggerConfig,
      wrapperConfig: {
        editorAppConfig: {
          $type: 'classic' as const,
          codeResources: {
            main: {
              enforceLanguageId: file?.language,
              text: file?.content || '',
              uri: (await this.loadMonaco()).Uri.parse(`file://${file?.path}`),
            },
          },
          domReadOnly: true,
          editorOptions: configurations,
          languageDef: await this.getLanguageDef(),
          useDiffEditor: false,
        },
      },
    };
  }
}

export { Manager };

export default Manager;
