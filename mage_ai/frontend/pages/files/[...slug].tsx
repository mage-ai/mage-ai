import FileType from '@interfaces/FileType';

type FileDetailPageProps = {
  file: FileType;
};

function FileDetailPage({
  file,
}: FileDetailPageProps) {
  return (
    <>
    </>
  );
}

FileDetailPage.getInitialProps = async (ctx: any) => {
  const { slug: slugArray }: { slug: string[] } = ctx.query;
  let filePath;

  if (Array.isArray(slugArray)) {
    filePath = slugArray[0];
  }

  return {
    file: {
      path: decodeURIComponent(filePath),
    },
  };
};

export default FileDetailPage;
