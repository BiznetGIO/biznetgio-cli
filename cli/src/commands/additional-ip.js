import { apiRequest } from '../client.js';
import { output } from '../utils/formatter.js';
import { withAuth, CYCLE_CHOICES } from '../utils/common.js';

const BASE_PATH = '/baremetal-additional-ips';

export function registerAdditionalIpCommands(program) {
  const ip = program
    .command('additional-ip')
    .description('Manage bare metal additional IPs');

  ip
    .command('list')
    .description('List additional IPs')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', BASE_PATH, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('detail')
    .description('Get additional IP details')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('create')
    .description('Create an additional IP')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .option('--region <region>', 'Region')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
      };
      if (opts.region) body.region = opts.region;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', BASE_PATH, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  ip
    .command('delete')
    .description('Delete an additional IP')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('regions')
    .description('List available regions')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', `${BASE_PATH}/regions`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('products')
    .description('List additional IP products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', `${BASE_PATH}/products`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('product')
    .description('Get additional IP product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('assignments')
    .description('List IP assignments by metal account')
    .argument('<metal_account_id>', 'Metal account ID')
    .action(withAuth(async (opts, metalAccountId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/assignments-by-metal-account-id/${metalAccountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('assigns')
    .description('List IP assigns for an account')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/${accountId}/assigns`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('assign')
    .description('Assign an additional IP to a metal account')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--metal-account-id <metal_account_id>', 'Metal account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('PUT', `${BASE_PATH}/${accountId}/assigns`, {
        apiKey: opts.apiKey,
        body: { metal_account_id: opts.metalAccountId },
      });
      output(data, opts);
    }));

  ip
    .command('assign-detail')
    .description('Get assign detail for a specific metal account')
    .argument('<account_id>', 'Account ID')
    .argument('<metal_account_id>', 'Metal account ID')
    .action(withAuth(async (opts, accountId, metalAccountId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/${accountId}/assigns/${metalAccountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  ip
    .command('unassign')
    .description('Unassign an additional IP from a metal account')
    .argument('<account_id>', 'Account ID')
    .argument('<metal_account_id>', 'Metal account ID')
    .action(withAuth(async (opts, accountId, metalAccountId) => {
      const data = await apiRequest('DELETE', `${BASE_PATH}/${accountId}/assigns/${metalAccountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));
}
