class AssociatedUserPresenter():
    def user(self, **kwargs):
        user = self.resource.user
        roles_new = [role.to_dict() for role in user.roles_new]
        if user:
            return {
                'avatar': user.avatar,
                'first_name': user.first_name,
                'id': user.id,
                'last_name': user.last_name,
                'owner': user.owner,
                'project_access': user.project_access,
                'roles': user.roles,
                'roles_display': user.roles_display,
                'roles_new': roles_new,
                'username': user.username,
            }
        else:
            return None
