from mage_ai.api.errors import ApiError


class VersionControlErrors:
    def validate_output(self):
        if self.model and self.model.output:
            has_error = False
            for output in (self.model.output or []):
                has_error = 'error' in output or 'fatal' in output
                if has_error:
                    break

            if has_error:
                return
                raise ApiError(ApiError.RESOURCE_ERROR | dict(
                    message='\n'.join(self.model.output),
                ))
