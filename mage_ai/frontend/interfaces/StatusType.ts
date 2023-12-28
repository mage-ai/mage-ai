export default interface StatusType {
  is_instance_manager?: boolean;
  max_print_output_lines?: number;
  repo_path?: string;
  repo_path_relative?: string;
  repo_path_relative_root?: string;
  repo_path_root?: string;
  scheduler_status?: string;
  instance_type?: string;
  disable_pipeline_edit_access?: boolean;
  require_user_authentication?: boolean;
  require_user_permissions?: boolean;
  project_type?: string;
  project_uuid?: string;
}
