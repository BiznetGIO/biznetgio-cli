import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerAdditionalIpTools(server) {
  server.tool(
    'additional_ip_list',
    'List additional IP accounts',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetal-additional-ips');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_detail',
    'Get additional IP account details',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-additional-ips/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_create',
    'Create a new additional IP',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      region: z.string().optional().describe('Region'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/baremetal-additional-ips', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_delete',
    'Delete an additional IP',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/baremetal-additional-ips/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_regions',
    'List available regions for additional IPs',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetal-additional-ips/regions');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_products',
    'List additional IP products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/baremetal-additional-ips/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_product_detail',
    'Get additional IP product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-additional-ips/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_assignments',
    'Get additional IP assignments by metal account ID',
    { metal_account_id: z.number().describe('Metal account ID') },
    async ({ metal_account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-additional-ips/assignments-by-metal-account-id/${metal_account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_assigns',
    'Get additional IP assigns for an account',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-additional-ips/${account_id}/assigns`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_assign',
    'Assign an additional IP to a metal account',
    { account_id: z.number().describe('Account ID'), metal_account_id: z.number().describe('Metal account ID to assign to') },
    async ({ account_id, metal_account_id }) => {
      try {
        const result = await apiRequest('PUT', `/baremetal-additional-ips/${account_id}/assigns`, { body: { metal_account_id } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_assign_detail',
    'Get additional IP assignment details',
    { account_id: z.number().describe('Account ID'), metal_account_id: z.number().describe('Metal account ID') },
    async ({ account_id, metal_account_id }) => {
      try {
        const result = await apiRequest('GET', `/baremetal-additional-ips/${account_id}/assigns/${metal_account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'additional_ip_unassign',
    'Unassign an additional IP from a metal account',
    { account_id: z.number().describe('Account ID'), metal_account_id: z.number().describe('Metal account ID') },
    async ({ account_id, metal_account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/baremetal-additional-ips/${account_id}/assigns/${metal_account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
