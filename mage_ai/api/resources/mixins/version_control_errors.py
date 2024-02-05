from mage_ai.api.errors import ApiError


class VersionControlErrors:
    def validate_output(self):
        if self.model and self.model.output:
            has_error = False
            for output in (self.model.output or []):
                if isinstance(output, dict):
                    has_error = 'error' in output or 'fatal' in output
                elif isinstance(output, str):
                    has_error = (
                        output.strip().startswith('error') or
                        output.strip().startswith('fatal')
                    )

                if has_error:
                    break

            if has_error:
                # Let the command center version control application handle the errors.
                return
                raise ApiError(ApiError.RESOURCE_ERROR | dict(
                    message='\n'.join(self.model.output),
                ))
