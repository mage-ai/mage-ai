export default interface ErrorsType {
  errors: {
    code: number;
    messages: string[];
  };
  response: {
    error: {
      code: number;
      message: string;
      type: string;
    };
    status: number;
  };
}
