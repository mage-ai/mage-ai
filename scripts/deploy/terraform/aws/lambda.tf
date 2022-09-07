# lambda.tf | Lambda Function Configuration

data "archive_file" "zip_the_python_code" {
  type        = "zip"
  source_dir  = "${path.module}/python/"
  output_path = "${path.module}/python/event_handler.zip"
}

resource "aws_lambda_function" "terraform_lambda_func" {
  filename        = "${path.module}/python/event_handler.zip"
  function_name   = "${var.app_name}-events"
  role            = aws_iam_role.lambda_role.arn
  handler         = "event_handler.lambda_handler"
  runtime         = "python3.8"
  depends_on      = [aws_iam_role_policy_attachment.attach_iam_policy_to_lambda_role,
                      aws_alb.application_load_balancer]

  environment {
    variables = {
      MAGE_API_HOST = aws_alb.application_load_balancer.dns_name,
    }
  }
}
