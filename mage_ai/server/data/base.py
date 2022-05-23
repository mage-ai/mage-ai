import os
import os.path

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'files'))

class Model():
    def __init__(self, id=None):
        # TODO: figure out a good directory to store the files
        if not os.path.isdir(DATA_PATH):
            os.mkdir(DATA_PATH)

        self.path = self.path_name()
        print('path:', self.path)
        if not os.path.isdir(self.path):
            os.mkdir(self.path)

        if id is None:
            dirs = [name for name in os.listdir(self.path)]
            max = -1
            for dir in dirs:
                if int(dir) > max:
                    max = int(dir)
            self.id = max + 1
        else:
            self.id = id
        
        self.dir = os.path.join(self.path, str(self.id))
        if not os.path.isdir(self.dir):
            os.mkdir(self.dir)
    
    @classmethod
    def folder_name(cls):
        return cls.__name__

    def to_dict(self):
        pass

    @classmethod
    def path_name(cls):
        return os.path.join(DATA_PATH, cls.folder_name())

    @classmethod
    def objects(cls):
        dirs = [name for name in os.listdir(cls.path_name())]
        return [cls(id=id) for id in dirs]
