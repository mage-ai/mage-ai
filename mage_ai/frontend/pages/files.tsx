import FilesPageComponent from '@components/Files';
import PrivateRoute from '@components/shared/PrivateRoute';

function FilesPage({
  query,
}: {
  query?: {
    file_path: string;
  };
}) {
  return (
    <FilesPageComponent query={query} />
  );
}

FilesPage.getInitialProps = async ctx => ({
  query: ctx.query,
});

export default PrivateRoute(FilesPage);
