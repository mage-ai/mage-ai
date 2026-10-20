# Stripe

![](https://user-images.githubusercontent.com/78053898/198754241-6581cb14-eddc-425b-b90f-e2a11ef22782.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `account_id` | Your Stripe account’s unique ID. | `73bb...` |
| `client_secret` | A secret key associated with your Stripe account. | `ABC1...` |
| `start_date` | The date you want to start syncing from. | `2022-01-01` |

> Find your API keys
>
> See Stripe’s [documentation](https://stripe.com/docs/keys).

<br />

## Schema

- [Balance transactions](./schemas/balance_transactions.json)
- [Charges](./schemas/charges.json)
- [Coupons](./schemas/coupons.json)
- [Customers](./schemas/customers.json)
- [Disputes](./schemas/disputes.json)
- [Events](./schemas/events.json)
- [Invoice items](./schemas/invoice_items.json)
- [Invoice line_items](./schemas/invoice_line_items.json)
- [Invoices](./schemas/invoices.json)
- [Payment intents](./schemas/payment_intents.json)
- [Payout transactions](./schemas/payout_transactions.json)
- [Payouts](./schemas/payouts.json)
- [Plans](./schemas/plans.json)
- [Products](./schemas/products.json)
- [Subscription_items](./schemas/subscription_items.json)
- [Subscriptions](./schemas/subscriptions.json)
- [Transfers](./schemas/transfers.json)

<br />
