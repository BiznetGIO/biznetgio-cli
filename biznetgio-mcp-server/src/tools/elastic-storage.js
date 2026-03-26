import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerElasticStorageTools(server) {
  server.tool(
    'elastic_storage_list',
    'List NEO Elastic Storage accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/baremetal-neo-elastic-storages', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_detail',
    'Get NEO Elastic Storage account details',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-neo-elastic-storages/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_create',
    'Create a new NEO Elastic Storage',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      storage_name: z.string().describe('Storage name'),
      metal_account_id: z.number().describe('Metal account ID to attach to'),
      size: z.number().optional().describe('Storage size'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/baremetal-neo-elastic-storages', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_upgrade',
    'Upgrade NEO Elastic Storage size',
    {
      account_id: z.number().describe('Account ID'),
      size: z.number().describe('New size'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, size, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/baremetal-neo-elastic-storages/${account_id}`, { body: { size, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_change_package',
    'Change NEO Elastic Storage package',
    {
      account_id: z.number().describe('Account ID'),
      new_product_id: z.number().describe('New product ID'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, new_product_id, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('POST', `/baremetal-neo-elastic-storages/${account_id}`, { body: { new_product_id, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_delete',
    'Delete a NEO Elastic Storage',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/baremetal-neo-elastic-storages/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_products',
    'List NEO Elastic Storage products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetal-neo-elastic-storages/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'elastic_storage_product_detail',
    'Get NEO Elastic Storage product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-neo-elastic-storages/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
