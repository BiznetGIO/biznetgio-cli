import { apiRequest } from '../client.js';
import { output } from '../utils/formatter.js';
import { withAuth, CYCLE_CHOICES, METAL_STATES } from '../utils/common.js';

export function registerMetalCommands(program) {
  const metal = program
    .command('metal')
    .description('Manage bare metal servers');

  metal
    .command('list')
    .description('List bare metal accounts')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', '/baremetals/accounts', { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  metal
    .command('detail')
    .description('Get bare metal account details')
    .argument('<account_id>', 'Account ID')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts, accountId) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', `/baremetals/accounts/${accountId}`, { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  metal
    .command('create')
    .description('Create a bare metal server')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--keypair-id <keypair_id>', 'Keypair ID')
    .requiredOption('--label <label>', 'Server label')
    .requiredOption('--public-ip <public_ip>', 'Public IP')
    .option('--select-os <os>', 'Operating system')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
        keypair_id: opts.keypairId,
        label: opts.label,
        public_ip: opts.publicIp,
      };
      if (opts.selectOs) body.select_os = opts.selectOs;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', '/baremetals', { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  metal
    .command('delete')
    .description('Delete a bare metal server')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `/baremetals/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('update-label')
    .description('Update bare metal server label')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--label <label>', 'New label')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('PUT', `/baremetals/${accountId}`, {
        apiKey: opts.apiKey,
        body: { label: opts.label },
      });
      output(data, opts);
    }));

  metal
    .command('state')
    .description('Get bare metal server state')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/baremetals/accounts/${accountId}/state`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('set-state')
    .description('Set bare metal server state')
    .argument('<account_id>', 'Account ID')
    .argument('<state>', `State (${METAL_STATES.join(', ')})`)
    .action(withAuth(async (opts, accountId, state) => {
      const data = await apiRequest('PUT', `/baremetals/accounts/${accountId}/state/${state}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('rebuild')
    .description('Rebuild a bare metal server')
    .argument('<account_id>', 'Account ID')
    .option('--os <os>', 'Operating system')
    .action(withAuth(async (opts, accountId) => {
      const body = {};
      if (opts.os) body.os = opts.os;
      const data = await apiRequest('PUT', `/baremetals/${accountId}/rebuild`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  metal
    .command('openvpn')
    .description('Get OpenVPN configuration')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/baremetals/openvpn', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('products')
    .description('List bare metal products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/baremetals/products', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('product')
    .description('Get bare metal product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/baremetals/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('product-os')
    .description('List operating systems for a product')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/baremetals/products/${productId}/oss`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('rebuild-os')
    .description('List operating systems available for rebuild')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/baremetals/${accountId}/rebuild/oss`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  metal
    .command('states')
    .description('List available bare metal states')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/baremetals/states', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Keypair subcommand group
  const keypair = metal
    .command('keypair')
    .description('Manage bare metal keypairs');

  keypair
    .command('list')
    .description('List keypairs')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/baremetals/keypairs/', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  keypair
    .command('create')
    .description('Create a new keypair')
    .requiredOption('--name <name>', 'Keypair name')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('POST', '/baremetals/keypairs/', {
        apiKey: opts.apiKey,
        body: { name: opts.name },
      });
      output(data, opts);
    }));

  keypair
    .command('import')
    .description('Import a keypair')
    .requiredOption('--name <name>', 'Keypair name')
    .option('--public-key <public_key>', 'Public key')
    .action(withAuth(async (opts) => {
      const body = { name: opts.name };
      if (opts.publicKey) body.public_key = opts.publicKey;
      const data = await apiRequest('POST', '/baremetals/keypairs/import', {
        apiKey: opts.apiKey,
        body,
      });
      output(data, opts);
    }));

  keypair
    .command('delete')
    .description('Delete a keypair')
    .argument('<keypair_id>', 'Keypair ID')
    .action(withAuth(async (opts, keypairId) => {
      const data = await apiRequest('DELETE', `/baremetals/keypairs/${keypairId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));
}
