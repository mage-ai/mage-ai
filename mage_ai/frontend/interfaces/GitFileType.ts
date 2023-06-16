export default interface GitFileType {
  content?: string;
  content_from_base?: string;
  content_from_compare?: string;
  error?: string;
  filename?: string;
  modified?: boolean;
}
