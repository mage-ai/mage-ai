import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'

console.log('Configuring OTLP Exporter..')
// print out the environment variables
const OTEL_EXPORTER_OTLP_HTTP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || null;
console.log('OTEL_EXPORTER_OTLP_HTTP_ENDPOINT: ', OTEL_EXPORTER_OTLP_HTTP_ENDPOINT)

const exporter = new OTLPTraceExporter({ 
  url: OTEL_EXPORTER_OTLP_HTTP_ENDPOINT
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'mage-ai-app',
  }),
  spanProcessor: new SimpleSpanProcessor(exporter),
})

sdk.start()
