import KernelOutputType from './KernelOutputType';

export default interface KernelType {
  alive: boolean;
  id: string;
  name: string;
}

export type SetMessagesType = {
  setMessages: (messages: {
    [uuid: string]: KernelOutputType[];
  }) => void;
};
