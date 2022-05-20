import os
import os.path

class Model():
    def __init__(self, id=None):
        # TODO: figure out a good directory to store the files
        data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'files'))
        self.path = os.path.join(data_path, self.folder_name())
        if not os.path.isdir(self.path):
            os.mkdir(self.path)

        if id is None:
            dirs = [name for name in os.listdir(self.path)]
            self.id = len(dirs)
        else:
            self.id = id
        
        self.dir = os.path.join(self.path, str(self.id))
        if not os.path.isdir(self.dir):
            os.mkdir(self.dir)
    
    def folder_name(self):
        pass

    def to_dict(self):
        pass

    @classmethod
    def objects(self):
        dirs = [name for name in os.listdir(self.path)]
        return [self(id) for id in dirs]
