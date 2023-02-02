class AssociatedUserPresenter():
    def user(self, **kwargs):
        user = self.resource.user
        if user:
            return {
                'avatar': user.avatar,
                'first_name': user.first_name,
                'id': user.id,
                'last_name': user.last_name,
                'username': user.username,
            }
        else:
            return None
