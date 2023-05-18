from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import extract_including_blank_values


class UserPresenter(BasePresenter):
    default_attributes = [
        'avatar',
        'email',
        'first_name',
        'id',
        'last_name',
        'owner',
        'roles',
        'roles_display',
        'roles_new',
        'project_access',
        'username',
    ]

    def present(self, **kwargs):
        data = self.model.to_dict(include_attributes=self.default_attributes)
        data = extract_including_blank_values(data, self.default_attributes)

        return data


UserPresenter.register_format(
    constants.CREATE, UserPresenter.default_attributes + ['token', ])
