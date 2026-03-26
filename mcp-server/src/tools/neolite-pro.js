import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerNeoliteProTools(server) {
  // --- Accounts ---

  server.tool(
    'neolite_pro_list',
    'List NEO Lite Pro accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_detail',
    'Get NEO Lite Pro account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_create',
    'Create a new NEO Lite Pro instance',
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
        const result = await apiRequest('POST', '/neolite-pros', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_delete',
    'Delete a NEO Lite Pro instance',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolite-pros/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_vm_details',
    'Get NEO Lite Pro VM details',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/accounts/${account_id}/vm-details`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_set_state',
    'Set NEO Lite Pro VM state',
    {
      account_id: z.number().describe('Account ID'),
      state: z.enum(['stop', 'suspend', 'resume', 'shutdown', 'start', 'reset']).describe('Desired VM state'),
    },
    async ({ account_id, state }) => {
      try {
        const result = await apiRequest('PUT', `/neolite-pros/accounts/${account_id}/vm-state/${state}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_rename',
    'Rename a NEO Lite Pro VM',
    { account_id: z.number().describe('Account ID'), name: z.string().optional().describe('New VM name') },
    async ({ account_id, name }) => {
      try {
        const body = name !== undefined ? { name } : {};
        const result = await apiRequest('PUT', `/neolite-pros/accounts/${account_id}/change-vm-name`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_rebuild',
    'Rebuild a NEO Lite Pro VM',
    { account_id: z.number().describe('Account ID'), select_os: z.string().optional().describe('Operating system') },
    async ({ account_id, select_os }) => {
      try {
        const body = select_os ? { select_os } : {};
        const result = await apiRequest('PUT', `/neolite-pros/accounts/${account_id}/rebuild`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_change_keypair',
    'Change NEO Lite Pro VM keypair',
    { account_id: z.number().describe('Account ID'), keypair_id: z.number().describe('New keypair ID') },
    async ({ account_id, keypair_id }) => {
      try {
        const result = await apiRequest('PUT', `/neolite-pros/accounts/${account_id}/keypair`, { body: { keypair_id } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_change_package_options',
    'Get available package change options for NEO Lite Pro',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/accounts/${account_id}/change-package`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_change_package',
    'Change NEO Lite Pro package',
    {
      account_id: z.number().describe('Account ID'),
      new_product_id: z.number().describe('New product ID'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, new_product_id, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('POST', `/neolite-pros/accounts/${account_id}/change-package`, { body: { new_product_id, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_storage_options',
    'Get NEO Lite Pro storage upgrade options',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/accounts/${account_id}/storage`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_upgrade_storage',
    'Upgrade NEO Lite Pro storage',
    {
      account_id: z.number().describe('Account ID'),
      disk_size: z.number().describe('New disk size'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, disk_size, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/neolite-pros/accounts/${account_id}/storage`, { body: { disk_size, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Products ---

  server.tool(
    'neolite_pro_products',
    'List NEO Lite Pro products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_product_detail',
    'Get NEO Lite Pro product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_product_os',
    'List available OS for a NEO Lite Pro product',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/products/${product_id}/oss`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_product_ip',
    'Check IP availability for a NEO Lite Pro product',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/products/${product_id}/ip-availability`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Keypairs ---

  server.tool(
    'neolite_pro_keypair_list',
    'List NEO Lite Pro keypairs',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/keypairs/');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_keypair_create',
    'Create a new NEO Lite Pro keypair',
    { name: z.string().describe('Keypair name') },
    async ({ name }) => {
      try {
        const result = await apiRequest('POST', '/neolite-pros/keypairs/', { body: { name } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_keypair_import',
    'Import a NEO Lite Pro keypair',
    { name: z.string().describe('Keypair name'), public_key: z.string().optional().describe('Public key content') },
    async ({ name, public_key }) => {
      try {
        const result = await apiRequest('POST', '/neolite-pros/keypairs/import', { body: { name, public_key } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_keypair_delete',
    'Delete a NEO Lite Pro keypair',
    { keypair_id: z.number().describe('Keypair ID') },
    async ({ keypair_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolite-pros/keypairs/${keypair_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Snapshots ---

  server.tool(
    'neolite_pro_snapshot_list',
    'List NEO Lite Pro snapshot accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/snapshots/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_detail',
    'Get NEO Lite Pro snapshot account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/snapshots/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_create',
    'Create a NEO Lite Pro snapshot',
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
        const result = await apiRequest('POST', `/neolite-pros/accounts/${account_id}/snapshot`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_create_instance',
    'Create a NEO Lite Pro instance from snapshot',
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
        const result = await apiRequest('POST', `/neolite-pros/snapshots/accounts/${account_id}/create`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_restore',
    'Restore a NEO Lite Pro snapshot',
    { account_id: z.number().describe('Snapshot account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('PUT', `/neolite-pros/snapshots/accounts/${account_id}/restore`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_delete',
    'Delete a NEO Lite Pro snapshot',
    { account_id: z.number().describe('Snapshot account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolite-pros/snapshots/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_products',
    'List NEO Lite Pro snapshot products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/snapshots/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_snapshot_product_detail',
    'Get NEO Lite Pro snapshot product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/snapshots/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Disks ---

  server.tool(
    'neolite_pro_disk_list',
    'List NEO Lite Pro disk accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/disks/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_detail',
    'Get NEO Lite Pro disk account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/disks/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_create',
    'Create a NEO Lite Pro disk',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      neolite_account_id: z.number().describe('NEO Lite Pro account ID to attach to'),
      service_name: z.string().optional().describe('Service name'),
      size: z.number().optional().describe('Disk size'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/neolite-pros/disks', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_upgrade',
    'Upgrade a NEO Lite Pro disk',
    {
      account_id: z.number().describe('Account ID'),
      additional_size: z.number().optional().describe('Additional disk size'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, additional_size, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/neolite-pros/disks/accounts/${account_id}`, { body: { additional_size, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_delete',
    'Delete a NEO Lite Pro disk',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/neolite-pros/disks/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_products',
    'List NEO Lite Pro disk products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/neolite-pros/disks/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'neolite_pro_disk_product_detail',
    'Get NEO Lite Pro disk product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/neolite-pros/disks/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
