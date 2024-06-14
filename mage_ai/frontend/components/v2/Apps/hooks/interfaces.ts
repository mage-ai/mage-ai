export interface ApiHookType {
  api: {
    create: (payload: any) => Promise<Record<string, any>>;
    delete: (uuid: any) => Promise<Record<string, any>>;
    detail: (uuid: any) => Promise<Record<string, any>>;
    list: (query: any) => Promise<Record<string, any>>;
    update: (uuid: string, payload: any) => Promise<Record<string, any>>;
  };
  loading: {
    create: boolean;
    delete: boolean;
    detail: boolean;
    list: boolean;
    update: boolean;
  };
}
