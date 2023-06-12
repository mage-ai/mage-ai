export default interface GitFileType {
  content?: string;
  content_from_base?: string;
  content_from_compare?: string;
  filename?: string;
  modified?: boolean;
}
