import os


class File:
    def __init__(self, filename, dir_path, repo_path):
        self.filename = filename
        self.dir_path = dir_path
        self.repo_path = repo_path

    @property
    def file_path(self):
        return os.path.join(self.repo_path, self.dir_path, self.filename)

    @classmethod
    def create(self, filename, dir_path, repo_path):
        file = File(filename, dir_path, repo_path)
        with open(file.file_path, 'w'):
            pass
        return file

    @classmethod
    def from_path(self, file_path, repo_path):
        return File(os.path.basename(file_path), os.path.dirname(file_path), repo_path)

    @classmethod
    def get_all_files(self, repo_path):
        file_paths = []
        for r, d, f in os.walk(repo_path):
            if '.variables' in r:
                continue
            for file in f:
                file_paths.append(os.path.join(r, file))
        return [os.path.relpath(p, repo_path) for p in file_paths]

    def content(self):
        with open(self.file_path) as fp:
            file_content = fp.read()
        return file_content 

    def update_content(self, content):
        with open(self.file_path, 'w') as fp:
            fp.write(content)

    def delete(self):
        os.remove(self.file_path)

    def to_dict(self, include_content=False):
        data = dict(
            name=self.filename,
            path=os.path.join(self.dir_path, self.filename)
        )
        if include_content:
            data['content'] = self.content()
        return data
