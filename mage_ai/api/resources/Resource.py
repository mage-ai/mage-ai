class Resource():
    def __init__(self, model, current_user, **kwargs):
        self.current_user = current_user
        self.model = model
        self.model_options = kwargs
        self.result_set_attr = None
