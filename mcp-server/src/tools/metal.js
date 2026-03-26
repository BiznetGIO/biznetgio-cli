import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerMetalTools(server) {
  server.tool(
    'metal_list',
    'List NEO Metal accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/baremetals/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_detail',
    'Get NEO Metal account details',
    { account_id: z.number().describe('Account ID'), status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ account_id, status }) => {
      try {
        const result = await apiRequest('GET', `/baremetals/accounts/${account_id}`, { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_create',
    'Create a new NEO Metal server',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      select_os: z.string().optional().describe('Operating system'),
      keypair_id: z.number().describe('Keypair ID'),
      label: z.string().describe('Server label'),
      public_ip: z.number().describe('Number of public IPs'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/baremetals', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_delete',
    'Delete a NEO Metal server',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/baremetals/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_update_label',
    'Update NEO Metal server label',
    { account_id: z.number().describe('Account ID'), label: z.string().describe('New label') },
    async ({ account_id, label }) => {
      try {
        const result = await apiRequest('PUT', `/baremetals/${account_id}`, { body: { label } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_state',
    'Get NEO Metal server state',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetals/accounts/${account_id}/state`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_set_state',
    'Set NEO Metal server state (on, off, reset)',
    { account_id: z.number().describe('Account ID'), state: z.enum(['on', 'off', 'reset']).describe('Desired state') },
    async ({ account_id, state }) => {
      try {
        const result = await apiRequest('PUT', `/baremetals/accounts/${account_id}/state/${state}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_rebuild',
    'Rebuild NEO Metal server',
    { account_id: z.number().describe('Account ID'), os: z.string().optional().describe('Operating system') },
    async ({ account_id, os }) => {
      try {
        const body = os ? { os } : undefined;
        const result = await apiRequest('PUT', `/baremetals/${account_id}/rebuild`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_openvpn',
    'Get OpenVPN configuration for NEO Metal',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetals/openvpn');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_products',
    'List NEO Metal products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetals/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_product_detail',
    'Get NEO Metal product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetals/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_product_os',
    'List available OS for a NEO Metal product',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetals/products/${product_id}/oss`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_rebuild_os',
    'List available OS options for rebuilding a NEO Metal server',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetals/${account_id}/rebuild/oss`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_states',
    'List available NEO Metal server states',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetals/states');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_keypair_list',
    'List NEO Metal keypairs',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetals/keypairs/');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_keypair_create',
    'Create a new NEO Metal keypair',
    { name: z.string().describe('Keypair name') },
    async ({ name }) => {
      try {
        const result = await apiRequest('POST', '/baremetals/keypairs/', { body: { name } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_keypair_import',
    'Import a NEO Metal keypair',
    { name: z.string().describe('Keypair name'), public_key: z.string().optional().describe('Public key content') },
    async ({ name, public_key }) => {
      try {
        const result = await apiRequest('POST', '/baremetals/keypairs/import', { body: { name, public_key } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'metal_keypair_delete',
    'Delete a NEO Metal keypair',
    { keypair_id: z.number().describe('Keypair ID') },
    async ({ keypair_id }) => {
      try {
        const result = await apiRequest('DELETE', `/baremetals/keypairs/${keypair_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
