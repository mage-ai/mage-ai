class classproperty(property):
    def __get__(self, owner_self, owner_cls):
        return self.fget(owner_cls)
