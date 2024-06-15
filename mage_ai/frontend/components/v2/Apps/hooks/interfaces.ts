import { HandlersType } from '@api/callbacks';

export interface ApiHookType {
  api: {
    create: (payload: any, handlers: HandlersType) => Promise<Record<string, any>>;
    delete: (uuid: any, handlers: HandlersType) => Promise<Record<string, any>>;
    detail: (uuid: any, handlers: HandlersType) => Promise<Record<string, any>>;
    list: (query: any, handlers: HandlersType) => Promise<Record<string, any>>;
    update: (uuid: string, payload: any, handlers: HandlersType) => Promise<Record<string, any>>;
  };
  loading: {
    create: boolean;
    delete: boolean;
    detail: boolean;
    list: boolean;
    update: boolean;
  };
}
