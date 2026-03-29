import { z } from 'zod';
import { apiRequest } from '../client.js';

function success(result) {
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function error(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }] };
}

export function registerObjectStorageTools(server) {
  // --- Accounts ---

  server.tool(
    'object_storage_list',
    'List Object Storage accounts',
    { status: z.array(z.string()).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        const result = await apiRequest('GET', '/object-storages/accounts', { query: { status } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_detail',
    'Get Object Storage account details',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_delete',
    'Delete an Object Storage account',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('DELETE', `/object-storages/${account_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_create',
    'Create a new Object Storage',
    {
      product_id: z.number().describe('Product ID'),
      cycle: z.string().describe('Billing cycle'),
      label: z.string().describe('Storage label'),
      quota: z.number().optional().describe('Storage quota'),
      promocode: z.string().optional().describe('Promo code'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async (params) => {
      try {
        const result = await apiRequest('POST', '/object-storages', { body: params });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_upgrade_quota',
    'Upgrade Object Storage quota',
    {
      account_id: z.number().describe('Account ID'),
      add_quota: z.number().optional().describe('Additional quota to add'),
      pay_invoice_with_cc: z.boolean().optional().describe('Pay invoice with credit card'),
    },
    async ({ account_id, add_quota, pay_invoice_with_cc }) => {
      try {
        const result = await apiRequest('PUT', `/object-storages/accounts/${account_id}`, { body: { add_quota, pay_invoice_with_cc } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_products',
    'List Object Storage products',
    {},
    async () => {
      try {
        const result = await apiRequest('GET', '/object-storages/products');
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_product_detail',
    'Get Object Storage product details',
    { product_id: z.number().describe('Product ID') },
    async ({ product_id }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/products/${product_id}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Credentials ---

  server.tool(
    'object_storage_credential_list',
    'List Object Storage credentials',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/credentials`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_credential_create',
    'Create Object Storage credential',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('POST', `/object-storages/accounts/${account_id}/credentials`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_credential_update',
    'Update Object Storage credential',
    {
      account_id: z.number().describe('Account ID'),
      access_key: z.string().describe('Access key'),
      active: z.boolean().describe('Active status'),
    },
    async ({ account_id, access_key, active }) => {
      try {
        const result = await apiRequest('PUT', `/object-storages/accounts/${account_id}/credentials/${access_key}`, { body: { active } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_credential_delete',
    'Delete Object Storage credential',
    {
      account_id: z.number().describe('Account ID'),
      access_key: z.string().describe('Access key'),
    },
    async ({ account_id, access_key }) => {
      try {
        const result = await apiRequest('DELETE', `/object-storages/accounts/${account_id}/credentials/${access_key}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Buckets ---

  server.tool(
    'object_storage_bucket_list',
    'List Object Storage buckets',
    { account_id: z.number().describe('Account ID') },
    async ({ account_id }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/buckets`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_bucket_create',
    'Create an Object Storage bucket',
    {
      account_id: z.number().describe('Account ID'),
      name: z.string().describe('Bucket name'),
      acl: z.string().optional().describe('Access control list'),
    },
    async ({ account_id, name, acl }) => {
      try {
        const result = await apiRequest('POST', `/object-storages/accounts/${account_id}/buckets`, { body: { name, acl } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_bucket_info',
    'Get Object Storage bucket info',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
    },
    async ({ account_id, bucket_name }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/info`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_bucket_usage',
    'Get Object Storage bucket usage',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
    },
    async ({ account_id, bucket_name }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/usage`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_bucket_set_acl',
    'Set Object Storage bucket ACL',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      acl: z.string().describe('Access control list'),
    },
    async ({ account_id, bucket_name, acl }) => {
      try {
        const result = await apiRequest('PUT', `/object-storages/accounts/${account_id}/buckets/${bucket_name}`, { body: { acl } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_bucket_delete',
    'Delete an Object Storage bucket',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
    },
    async ({ account_id, bucket_name }) => {
      try {
        const result = await apiRequest('DELETE', `/object-storages/accounts/${account_id}/buckets/${bucket_name}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  // --- Objects ---

  server.tool(
    'object_storage_object_list',
    'List objects in an Object Storage bucket',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      directory: z.string().optional().describe('Directory path'),
    },
    async ({ account_id, bucket_name, directory }) => {
      try {
        const path = directory
          ? `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects/${directory}/`
          : `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects`;
        const result = await apiRequest('GET', path);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_info',
    'Get Object Storage object info',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      path: z.string().describe('Object path'),
    },
    async ({ account_id, bucket_name, path: objectPath }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/info/${objectPath}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_download',
    'Download an Object Storage object',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      object_name: z.string().describe('Object name'),
    },
    async ({ account_id, bucket_name, object_name }) => {
      try {
        const result = await apiRequest('GET', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects/${object_name}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_url',
    'Generate a pre-signed URL for an Object Storage object',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      object_name: z.string().describe('Object name'),
      expiry: z.number().optional().describe('URL expiry time in seconds'),
    },
    async ({ account_id, bucket_name, object_name, expiry }) => {
      try {
        const body = expiry !== undefined ? { expiry } : {};
        const result = await apiRequest('POST', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/url/${object_name}`, { body });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_copy',
    'Copy an Object Storage object to another bucket',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Source bucket name'),
      to_bucket: z.string().describe('Destination bucket name'),
      object_name: z.string().describe('Object name'),
    },
    async ({ account_id, bucket_name, to_bucket, object_name }) => {
      try {
        const result = await apiRequest('POST', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/copy/${to_bucket}/${object_name}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_move',
    'Move an Object Storage object to another bucket',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Source bucket name'),
      to_bucket: z.string().describe('Destination bucket name'),
      object_name: z.string().describe('Object name'),
    },
    async ({ account_id, bucket_name, to_bucket, object_name }) => {
      try {
        const result = await apiRequest('PUT', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/move/${to_bucket}/${object_name}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_mkdir',
    'Create a directory in an Object Storage bucket',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      directory: z.string().describe('Directory name'),
    },
    async ({ account_id, bucket_name, directory }) => {
      try {
        const result = await apiRequest('POST', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects/${directory}/`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_set_acl',
    'Set ACL for an Object Storage object',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      path: z.string().describe('Object path'),
      acl: z.string().describe('Access control list'),
    },
    async ({ account_id, bucket_name, path: objectPath, acl }) => {
      try {
        const result = await apiRequest('PUT', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects/${objectPath}`, { body: { acl } });
        return success(result);
      } catch (err) { return error(err); }
    }
  );

  server.tool(
    'object_storage_object_delete',
    'Delete an Object Storage object',
    {
      account_id: z.number().describe('Account ID'),
      bucket_name: z.string().describe('Bucket name'),
      path: z.string().describe('Object path'),
    },
    async ({ account_id, bucket_name, path: objectPath }) => {
      try {
        const result = await apiRequest('DELETE', `/object-storages/accounts/${account_id}/buckets/${bucket_name}/objects/${objectPath}`);
        return success(result);
      } catch (err) { return error(err); }
    }
  );
}
