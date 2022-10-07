# Sensors: blocks depending on external pipelines

![sense](https://user-images.githubusercontent.com/97557538/194637618-db3840bc-0d15-400d-9796-20e53b0616a5.gif)

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
