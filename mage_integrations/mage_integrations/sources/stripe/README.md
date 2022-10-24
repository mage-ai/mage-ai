# Stripe

<img
  alt="Stripe"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png"
  width="300"
/>

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `account_id` | Amplitude project's unique API key. | `73bb...` |
| `client_secret` | Amplitude project's unique secret key. | `ABC1...` |
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
