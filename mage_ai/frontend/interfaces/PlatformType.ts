interface GitType {
  path?: string;
}

interface PlatformProjectType {
  git?: GitType;
  path?: string;
}

export default interface PlatformType {
  features?: {
    override?: boolean;
  };
  projects: {
    [uuid: string]: PlatformProjectType;
  };
}
