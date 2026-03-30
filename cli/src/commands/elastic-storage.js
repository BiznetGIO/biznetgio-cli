import { apiRequest } from '../client.js';
import { output } from '../utils/formatter.js';
import { withAuth, CYCLE_CHOICES, toInt } from '../utils/common.js';

const BASE_PATH = '/baremetal-neo-elastic-storages';

export function registerElasticStorageCommands(program) {
  const es = program
    .command('elastic-storage')
    .description('Manage bare metal elastic storage');

  es
    .command('list')
    .description('List elastic storages')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', BASE_PATH, { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  es
    .command('detail')
    .description('Get elastic storage details')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  es
    .command('create')
    .description('Create an elastic storage')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--storage-name <storage_name>', 'Storage name')
    .requiredOption('--metal-account-id <metal_account_id>', 'Metal account ID')
    .option('--size <size>', 'Storage size')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: toInt(opts.productId),
        cycle: opts.cycle,
        storage_name: opts.storageName,
        metal_account_id: toInt(opts.metalAccountId),
      };
      if (opts.size) body.size = toInt(opts.size);
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', BASE_PATH, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  es
    .command('upgrade')
    .description('Upgrade elastic storage size')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--size <size>', 'New size')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { size: toInt(opts.size) };
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('PUT', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  es
    .command('change-package')
    .description('Change elastic storage package')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--new-product-id <new_product_id>', 'New product ID')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { new_product_id: toInt(opts.newProductId) };
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  es
    .command('delete')
    .description('Delete an elastic storage')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `${BASE_PATH}/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  es
    .command('products')
    .description('List elastic storage products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', `${BASE_PATH}/products`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  es
    .command('product')
    .description('Get elastic storage product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `${BASE_PATH}/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));
}
