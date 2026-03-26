import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerNeoliteTools(server) {
  // --- Accounts ---

  server.tool(
    'neolite_list',
    'List NEO Lite accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolites/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_detail',
    'Get NEO Lite account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolites/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_create',
    'Create a new NEO Lite instance',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      select_os: z.string().describe('Operating system'),
      keypair_id: z.number().describe('Keypair ID'),
      vm_name: z.string().optional().describe('VM name'),
      description: z.string().optional().describe('Description'),
      ssh_and_console_user: z.string().describe('SSH and console username'),
      console_password: z.string().describe('Console password'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/neolites', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_delete',
    'Delete a NEO Lite instance',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolites/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_vm_details',
    'Get NEO Lite VM details',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/accounts/${account_id}/vm-details`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_set_state',
    'Set NEO Lite VM state',
    {
      account_id: z.number().describe('Account ID'),
      state: z.enum(['stop', 'suspend', 'resume', 'shutdown', 'start', 'reset']).describe('Desired VM state'),
    },
    async ({ account_id, state }) => {
      try {
        const result = await apiRequest('PUT', `/neolites/accounts/${account_id}/vm-state/${state}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_rename',
    'Rename a NEO Lite VM',
    { account_id: z.number().describe('Account ID'), name: z.string().optional().describe('New VM name') },
    async ({ account_id, name }) => {
      try {
        const body = name !== undefined ? { name } : {};
        const result = await apiRequest('PUT', `/neolites/accounts/${account_id}/change-vm-name`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_rebuild',
    'Rebuild a NEO Lite VM',
    { account_id: z.number().describe('Account ID'), select_os: z.string().optional().describe('Operating system') },
    async ({ account_id, select_os }) => {
      try {
        const body = select_os ? { select_os } : {};
        const result = await apiRequest('PUT', `/neolites/accounts/${account_id}/rebuild`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_change_keypair',
    'Change NEO Lite VM keypair',
    { account_id: z.number().describe('Account ID'), keypair_id: z.number().describe('New keypair ID') },
    async ({ account_id, keypair_id }) => {
      try {
        const result = await apiRequest('PUT', `/neolites/accounts/${account_id}/keypair`, { body: { keypair_id } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_change_package_options',
    'Get available package change options for NEO Lite',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/accounts/${account_id}/change-package`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_change_package',
    'Change NEO Lite package',
    {
      account_id: z.number().describe('Account ID'),
      new_product_id: z.number().describe('New product ID'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, new_product_id, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('POST', `/neolites/accounts/${account_id}/change-package`, { body: { new_product_id, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_storage_options',
    'Get NEO Lite storage upgrade options',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/accounts/${account_id}/storage`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_upgrade_storage',
    'Upgrade NEO Lite storage',
    {
      account_id: z.number().describe('Account ID'),
      disk_size: z.number().describe('New disk size'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, disk_size, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/neolites/accounts/${account_id}/storage`, { body: { disk_size, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_migrate_to_pro_products',
    'Get available products for migrating NEO Lite to Pro',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/accounts/${account_id}/migrate-to-pro/products`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_migrate_to_pro',
    'Migrate NEO Lite to Pro',
    {
      account_id: z.number().describe('Account ID'),
      neolitepro_product_id: z.number().describe('NEO Lite Pro product ID'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, neolitepro_product_id, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('POST', `/neolites/accounts/${account_id}/migrate-to-pro`, { body: { neolitepro_product_id, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Products ---

  server.tool(
    'neolite_products',
    'List NEO Lite products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolites/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_product_detail',
    'Get NEO Lite product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_product_os',
    'List available OS for a NEO Lite product',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/products/${product_id}/oss`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_product_ip',
    'Check IP availability for a NEO Lite product',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/products/${product_id}/ip-availability`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Keypairs ---

  server.tool(
    'neolite_keypair_list',
    'List NEO Lite keypairs',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolites/keypairs/');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_keypair_create',
    'Create a new NEO Lite keypair',
    { name: z.string().describe('Keypair name') },
    async ({ name }) => {
      try {
        const result = await apiRequest('POST', '/neolites/keypairs/', { body: { name } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_keypair_import',
    'Import a NEO Lite keypair',
    { name: z.string().describe('Keypair name'), public_key: z.string().optional().describe('Public key content') },
    async ({ name, public_key }) => {
      try {
        const result = await apiRequest('POST', '/neolites/keypairs/import', { body: { name, public_key } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_keypair_delete',
    'Delete a NEO Lite keypair',
    { keypair_id: z.number().describe('Keypair ID') },
    async ({ keypair_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolites/keypairs/${keypair_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Snapshots ---

  server.tool(
    'neolite_snapshot_list',
    'List NEO Lite snapshot accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolites/snapshots/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_detail',
    'Get NEO Lite snapshot account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolites/snapshots/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_create',
    'Create a NEO Lite snapshot',
    {
      account_id: z.number().describe('Account ID'),
      cycle: z.string().describe('Billing cycle'),
      name: z.string().optional().describe('Snapshot name'),
      description: z.string().optional().describe('Snapshot description'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, ...body }) => {
      try {
        const result = await apiRequest('POST', `/neolites/accounts/${account_id}/snapshot`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_create_instance',
    'Create a NEO Lite instance from snapshot',
    {
      account_id: z.number().describe('Snapshot account ID'),
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      keypair_id: z.number().describe('Keypair ID'),
      name: z.string().describe('Instance name'),
      description: z.string().optional().describe('Description'),
      ssh_and_console_user: z.string().describe('SSH and console username'),
      console_password: z.string().describe('Console password'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, ...body }) => {
      try {
        const result = await apiRequest('POST', `/neolites/snapshots/accounts/${account_id}/create`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_restore',
    'Restore a NEO Lite snapshot',
    { account_id: z.number().describe('Snapshot account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('PUT', `/neolites/snapshots/accounts/${account_id}/restore`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_delete',
    'Delete a NEO Lite snapshot',
    { account_id: z.number().describe('Snapshot account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolites/snapshots/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_products',
    'List NEO Lite snapshot products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolites/snapshots/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_snapshot_product_detail',
    'Get NEO Lite snapshot product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/snapshots/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Disks ---

  server.tool(
    'neolite_disk_list',
    'List NEO Lite disk accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolites/disks/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_detail',
    'Get NEO Lite disk account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolites/disks/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_create',
    'Create a NEO Lite disk',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      neolite_account_id: z.number().describe('NEO Lite account ID to attach to'),
      service_name: z.string().optional().describe('Service name'),
      size: z.number().optional().describe('Disk size'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/neolites/disks', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_upgrade',
    'Upgrade a NEO Lite disk',
    {
      account_id: z.number().describe('Account ID'),
      additional_size: z.number().optional().describe('Additional disk size'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, additional_size, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/neolites/disks/accounts/${account_id}`, { body: { additional_size, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_delete',
    'Delete a NEO Lite disk',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolites/disks/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_products',
    'List NEO Lite disk products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolites/disks/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_disk_product_detail',
    'Get NEO Lite disk product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolites/disks/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
