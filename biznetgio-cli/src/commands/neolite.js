import { apiRequest } from '../client.js';
import { output } from '../utils/formatter.js';
import { withAuth, CYCLE_CHOICES, VM_STATES } from '../utils/common.js';

export function registerNeoliteCommands(program) {
  const neolite = program
    .command('neolite')
    .description('Manage NEO Lite instances');

  neolite
    .command('list')
    .description('List NEO Lite accounts')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', '/neolites/accounts', { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  neolite
    .command('detail')
    .description('Get NEO Lite account details')
    .argument('<account_id>', 'Account ID')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts, accountId) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', `/neolites/accounts/${accountId}`, { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  neolite
    .command('create')
    .description('Create a NEO Lite instance')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--select-os <os>', 'Operating system')
    .requiredOption('--keypair-id <keypair_id>', 'Keypair ID')
    .requiredOption('--ssh-and-console-user <user>', 'SSH and console username')
    .requiredOption('--console-password <password>', 'Console password')
    .option('--vm-name <name>', 'VM name')
    .option('--description <description>', 'Description')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
        select_os: opts.selectOs,
        keypair_id: opts.keypairId,
        ssh_and_console_user: opts.sshAndConsoleUser,
        console_password: opts.consolePassword,
      };
      if (opts.vmName) body.vm_name = opts.vmName;
      if (opts.description) body.description = opts.description;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', '/neolites', { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  neolite
    .command('delete')
    .description('Delete a NEO Lite instance')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `/neolites/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('vm-details')
    .description('Get VM details for a NEO Lite account')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/neolites/accounts/${accountId}/vm-details`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('set-state')
    .description('Set VM state')
    .argument('<account_id>', 'Account ID')
    .argument('<state>', `State (${VM_STATES.join(', ')})`)
    .action(withAuth(async (opts, accountId, state) => {
      const data = await apiRequest('PUT', `/neolites/accounts/${accountId}/vm-state/${state}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('rename')
    .description('Rename a NEO Lite VM')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--name <name>', 'New VM name')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('PUT', `/neolites/accounts/${accountId}/change-vm-name`, {
        apiKey: opts.apiKey,
        body: { name: opts.name },
      });
      output(data, opts);
    }));

  neolite
    .command('rebuild')
    .description('Rebuild a NEO Lite VM')
    .argument('<account_id>', 'Account ID')
    .option('--select-os <os>', 'Operating system')
    .action(withAuth(async (opts, accountId) => {
      const body = {};
      if (opts.selectOs) body.select_os = opts.selectOs;
      const data = await apiRequest('PUT', `/neolites/accounts/${accountId}/rebuild`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  neolite
    .command('change-keypair')
    .description('Change keypair for a NEO Lite VM')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--keypair-id <keypair_id>', 'New keypair ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('PUT', `/neolites/accounts/${accountId}/keypair`, {
        apiKey: opts.apiKey,
        body: { keypair_id: opts.keypairId },
      });
      output(data, opts);
    }));

  neolite
    .command('change-package-options')
    .description('Get available package change options')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/neolites/accounts/${accountId}/change-package`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('change-package')
    .description('Change package for a NEO Lite account')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--new-product-id <product_id>', 'New product ID')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { new_product_id: opts.newProductId };
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', `/neolites/accounts/${accountId}/change-package`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  neolite
    .command('storage-options')
    .description('Get storage upgrade options')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/neolites/accounts/${accountId}/storage`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('upgrade-storage')
    .description('Upgrade storage for a NEO Lite account')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--disk-size <size>', 'Disk size')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { disk_size: opts.diskSize };
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('PUT', `/neolites/accounts/${accountId}/storage`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  neolite
    .command('migrate-to-pro-products')
    .description('List products available for migration to NEO Lite Pro')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/neolites/accounts/${accountId}/migrate-to-pro/products`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('migrate-to-pro')
    .description('Migrate a NEO Lite instance to NEO Lite Pro')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--neolitepro-product-id <product_id>', 'NEO Lite Pro product ID')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { neolitepro_product_id: opts.neoliteproProductId };
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', `/neolites/accounts/${accountId}/migrate-to-pro`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  neolite
    .command('products')
    .description('List NEO Lite products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/neolites/products', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('product')
    .description('Get NEO Lite product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/neolites/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('product-os')
    .description('List operating systems for a product')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/neolites/products/${productId}/oss`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  neolite
    .command('product-ip')
    .description('Check IP availability for a product')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/neolites/products/${productId}/ip-availability`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Keypair subcommand group
  const keypair = neolite
    .command('keypair')
    .description('Manage NEO Lite keypairs');

  keypair
    .command('list')
    .description('List keypairs')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/neolites/keypairs/', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  keypair
    .command('create')
    .description('Create a new keypair')
    .requiredOption('--name <name>', 'Keypair name')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('POST', '/neolites/keypairs/', {
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
      const data = await apiRequest('POST', '/neolites/keypairs/import', {
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
      const data = await apiRequest('DELETE', `/neolites/keypairs/${keypairId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Snapshot subcommand group
  const snapshot = neolite
    .command('snapshot')
    .description('Manage NEO Lite snapshots');

  snapshot
    .command('list')
    .description('List snapshot accounts')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', '/neolites/snapshots/accounts', { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  snapshot
    .command('detail')
    .description('Get snapshot account details')
    .argument('<account_id>', 'Account ID')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts, accountId) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', `/neolites/snapshots/accounts/${accountId}`, { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  snapshot
    .command('create')
    .description('Create a snapshot')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .option('--name <name>', 'Snapshot name')
    .option('--description <description>', 'Description')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = { cycle: opts.cycle };
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', `/neolites/accounts/${accountId}/snapshot`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  snapshot
    .command('create-instance')
    .description('Create a new instance from a snapshot')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--keypair-id <keypair_id>', 'Keypair ID')
    .requiredOption('--name <name>', 'Instance name')
    .requiredOption('--ssh-and-console-user <user>', 'SSH and console username')
    .requiredOption('--console-password <password>', 'Console password')
    .option('--description <description>', 'Description')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
        keypair_id: opts.keypairId,
        name: opts.name,
        ssh_and_console_user: opts.sshAndConsoleUser,
        console_password: opts.consolePassword,
      };
      if (opts.description) body.description = opts.description;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', `/neolites/snapshots/accounts/${accountId}/create`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  snapshot
    .command('restore')
    .description('Restore a snapshot')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('PUT', `/neolites/snapshots/accounts/${accountId}/restore`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  snapshot
    .command('delete')
    .description('Delete a snapshot')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `/neolites/snapshots/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  snapshot
    .command('products')
    .description('List snapshot products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/neolites/snapshots/products', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  snapshot
    .command('product')
    .description('Get snapshot product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/neolites/snapshots/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Disk subcommand group
  const disk = neolite
    .command('disk')
    .description('Manage NEO Lite disks');

  disk
    .command('list')
    .description('List disk accounts')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', '/neolites/disks/accounts', { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  disk
    .command('detail')
    .description('Get disk account details')
    .argument('<account_id>', 'Account ID')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts, accountId) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', `/neolites/disks/accounts/${accountId}`, { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  disk
    .command('create')
    .description('Create a new disk')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--neolite-account-id <account_id>', 'NEO Lite account ID')
    .option('--service-name <name>', 'Service name')
    .option('--size <size>', 'Disk size')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
        neolite_account_id: opts.neoliteAccountId,
      };
      if (opts.serviceName) body.service_name = opts.serviceName;
      if (opts.size) body.size = opts.size;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', '/neolites/disks', { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  disk
    .command('upgrade')
    .description('Upgrade a disk')
    .argument('<account_id>', 'Account ID')
    .option('--additional-size <size>', 'Additional disk size')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = {};
      if (opts.additionalSize) body.additional_size = opts.additionalSize;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('PUT', `/neolites/disks/accounts/${accountId}`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  disk
    .command('delete')
    .description('Delete a disk')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `/neolites/disks/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  disk
    .command('products')
    .description('List disk products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/neolites/disks/products', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  disk
    .command('product')
    .description('Get disk product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/neolites/disks/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));
}
