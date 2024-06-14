export interface ApiHookType {
  api: {
    create: (query: any) => Promise<Record<string, any>>;
    delete: (uuid: any) => Promise<Record<string, any>>;
    detail: (payload: any) => Promise<Record<string, any>>;
    list: (args: { uuid: string; payload: any }) => Promise<Record<string, any>>;
    update: (uuid: any) => Promise<Record<string, any>>;
  };
  loading: {
    create: boolean;
    delete: boolean;
    detail: boolean;
    list: boolean;
    update: boolean;
  };
}
