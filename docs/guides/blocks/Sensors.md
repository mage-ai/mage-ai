# Sensors: blocks depending on external pipelines

<img
  alt="Sensors"
  height="300"
  src="https://memegenerator.net/img/instances/47193607.jpg"
/>

In your pipeline, you can add sensors that run continuously and only complete
when an external pipeline or external block is successfully ran for a particular partition.

Then, you can add a block in your pipeline that depends on that sensor.

Therefore, your block won’t start running until the external pipeline or external block has
successfully ran.

<br />

## Setup

1. [Add a sensor to your pipeline](../../blocks/README.md#5-sensor)
1. [Configuring a sensor](../../core/abstractions.md#sensor)

<br />
