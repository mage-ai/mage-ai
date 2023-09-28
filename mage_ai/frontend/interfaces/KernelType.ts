import KernelOutputType from './KernelOutputType';

export default interface KernelType {
  alive: boolean;
  id: string;
  name: string;
  usage: {
    host_virtual_memory: any;
    kernel_cpu: number;
    kernel_memory: number;
    pid: number;
  }
}

export type SetMessagesType = {
  setMessages: (messages: {
    [uuid: string]: KernelOutputType[];
  }) => void;
};
