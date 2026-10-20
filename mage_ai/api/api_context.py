class ApiContext():
    # DANGER: do not allow this class to instantiate with any arguments.
    # For some reason and some unknown location previously, this class was being instantiated
    # with arguments that included some sort of stale data structure that was causing
    # API permission checking issues for every other request because the ResultSet was being
    # persisted somehow between requests.
    def __init__(self):
        self.data = {}
