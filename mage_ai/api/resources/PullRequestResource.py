from github import Auth, Github
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import api



class PullRequestResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        arr = []

        repository = query.get('repository', None)
        if repository:
            repository = repository[0]

            access_token = api.get_access_token_for_user(user)
            if access_token:
                auth = Auth.Token(access_token.token)
                g = Github(auth=auth)
                repo = g.get_repo(repository)
                pulls = repo.get_pulls(state='open', sort='created')

                for pr in pulls:
                    arr.append(dict(
                        body=pr.body,
                        created_at=pr.created_at,
                        id=pr.id,
                        is_merged=pr.is_merged(),
                        last_modified=pr.last_modified,
                        merged=pr.merged,
                        state=pr.state,
                        title=pr.title,
                        url=pr.html_url,
                        user=pr.user.login,
                    ))

        return self.build_result_set(arr, user, **kwargs)
