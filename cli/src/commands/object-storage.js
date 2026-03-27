import { apiRequest } from '../client.js';
import { output } from '../utils/formatter.js';
import { withAuth, CYCLE_CHOICES, ACL_OPTIONS } from '../utils/common.js';

export function registerObjectStorageCommands(program) {
  const objectStorage = program
    .command('object-storage')
    .description('Manage object storage');

  objectStorage
    .command('list')
    .description('List object storage accounts')
    .option('--status <status...>', 'Filter by status')
    .action(withAuth(async (opts) => {
      const query = {};
      if (opts.status) query.status = opts.status;
      const data = await apiRequest('GET', '/object-storages/accounts', { apiKey: opts.apiKey, query });
      output(data, opts);
    }));

  objectStorage
    .command('detail')
    .description('Get object storage account details')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  objectStorage
    .command('delete')
    .description('Delete an object storage account')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('DELETE', `/object-storages/${accountId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  objectStorage
    .command('create')
    .description('Create an object storage account')
    .requiredOption('--product-id <product_id>', 'Product ID')
    .requiredOption('--cycle <cycle>', `Billing cycle (${CYCLE_CHOICES.join(', ')})`)
    .requiredOption('--label <label>', 'Label')
    .option('--quota <quota>', 'Storage quota')
    .option('--promocode <promocode>', 'Promo code')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts) => {
      const body = {
        product_id: opts.productId,
        cycle: opts.cycle,
        label: opts.label,
      };
      if (opts.quota) body.quota = opts.quota;
      if (opts.promocode) body.promocode = opts.promocode;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('POST', '/object-storages', { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  objectStorage
    .command('upgrade-quota')
    .description('Upgrade object storage quota')
    .argument('<account_id>', 'Account ID')
    .option('--add-quota <quota>', 'Additional quota')
    .option('--pay-invoice-with-cc', 'Pay invoice with credit card')
    .action(withAuth(async (opts, accountId) => {
      const body = {};
      if (opts.addQuota) body.add_quota = opts.addQuota;
      if (opts.payInvoiceWithCc) body.pay_invoice_with_cc = true;
      const data = await apiRequest('PUT', `/object-storages/accounts/${accountId}`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  objectStorage
    .command('products')
    .description('List object storage products')
    .action(withAuth(async (opts) => {
      const data = await apiRequest('GET', '/object-storages/products', { apiKey: opts.apiKey });
      output(data, opts);
    }));

  objectStorage
    .command('product')
    .description('Get object storage product details')
    .argument('<product_id>', 'Product ID')
    .action(withAuth(async (opts, productId) => {
      const data = await apiRequest('GET', `/object-storages/products/${productId}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Credential subcommand group
  const credential = objectStorage
    .command('credential')
    .description('Manage object storage credentials');

  credential
    .command('list')
    .description('List credentials for an account')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/credentials`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  credential
    .command('create')
    .description('Create a new credential')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('POST', `/object-storages/accounts/${accountId}/credentials`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  credential
    .command('update')
    .description('Update a credential')
    .argument('<account_id>', 'Account ID')
    .argument('<access_key>', 'Access key')
    .requiredOption('--active <active>', 'Active status (true/false)')
    .action(withAuth(async (opts, accountId, accessKey) => {
      const data = await apiRequest('PUT', `/object-storages/accounts/${accountId}/credentials/${accessKey}`, {
        apiKey: opts.apiKey,
        body: { active: opts.active === 'true' },
      });
      output(data, opts);
    }));

  credential
    .command('delete')
    .description('Delete a credential')
    .argument('<account_id>', 'Account ID')
    .argument('<access_key>', 'Access key')
    .action(withAuth(async (opts, accountId, accessKey) => {
      const data = await apiRequest('DELETE', `/object-storages/accounts/${accountId}/credentials/${accessKey}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Bucket subcommand group
  const bucket = objectStorage
    .command('bucket')
    .description('Manage object storage buckets');

  bucket
    .command('list')
    .description('List buckets for an account')
    .argument('<account_id>', 'Account ID')
    .action(withAuth(async (opts, accountId) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/buckets`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  bucket
    .command('create')
    .description('Create a new bucket')
    .argument('<account_id>', 'Account ID')
    .requiredOption('--name <name>', 'Bucket name')
    .option('--acl <acl>', `Access control (${ACL_OPTIONS.join(', ')})`)
    .action(withAuth(async (opts, accountId) => {
      const body = { name: opts.name };
      if (opts.acl) body.acl = opts.acl;
      const data = await apiRequest('POST', `/object-storages/accounts/${accountId}/buckets`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  bucket
    .command('info')
    .description('Get bucket info')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .action(withAuth(async (opts, accountId, bucketName) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/buckets/${bucketName}/info`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  bucket
    .command('usage')
    .description('Get bucket usage')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .action(withAuth(async (opts, accountId, bucketName) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/buckets/${bucketName}/usage`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  bucket
    .command('set-acl')
    .description('Set bucket ACL')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .requiredOption('--acl <acl>', `Access control (${ACL_OPTIONS.join(', ')})`)
    .action(withAuth(async (opts, accountId, bucketName) => {
      const data = await apiRequest('PUT', `/object-storages/accounts/${accountId}/buckets/${bucketName}`, {
        apiKey: opts.apiKey,
        body: { acl: opts.acl },
      });
      output(data, opts);
    }));

  bucket
    .command('delete')
    .description('Delete a bucket')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .action(withAuth(async (opts, accountId, bucketName) => {
      const data = await apiRequest('DELETE', `/object-storages/accounts/${accountId}/buckets/${bucketName}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  // Object subcommand group
  const object = objectStorage
    .command('object')
    .description('Manage objects in buckets');

  object
    .command('list')
    .description('List objects in a bucket')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('[directory]', 'Directory path')
    .action(withAuth(async (opts, accountId, bucketName, directory) => {
      let path = `/object-storages/accounts/${accountId}/buckets/${bucketName}/objects`;
      if (directory) path += `/${directory}/`;
      const data = await apiRequest('GET', path, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('info')
    .description('Get object or directory info')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<path>', 'Object or directory path')
    .action(withAuth(async (opts, accountId, bucketName, objectPath) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/buckets/${bucketName}/info/${objectPath}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('download')
    .description('Download an object')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<object_name>', 'Object name')
    .action(withAuth(async (opts, accountId, bucketName, objectName) => {
      const data = await apiRequest('GET', `/object-storages/accounts/${accountId}/buckets/${bucketName}/objects/${objectName}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('url')
    .description('Generate a presigned URL for an object')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<object_name>', 'Object name')
    .option('--expiry <expiry>', 'URL expiry time')
    .action(withAuth(async (opts, accountId, bucketName, objectName) => {
      const body = {};
      if (opts.expiry) body.expiry = opts.expiry;
      const data = await apiRequest('POST', `/object-storages/accounts/${accountId}/buckets/${bucketName}/url/${objectName}`, { apiKey: opts.apiKey, body });
      output(data, opts);
    }));

  object
    .command('copy')
    .description('Copy an object to another bucket')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Source bucket name')
    .argument('<to_bucket>', 'Destination bucket name')
    .argument('<object_name>', 'Object name')
    .action(withAuth(async (opts, accountId, bucketName, toBucket, objectName) => {
      const data = await apiRequest('POST', `/object-storages/accounts/${accountId}/buckets/${bucketName}/copy/${toBucket}/${objectName}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('move')
    .description('Move an object to another bucket')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Source bucket name')
    .argument('<to_bucket>', 'Destination bucket name')
    .argument('<object_name>', 'Object name')
    .action(withAuth(async (opts, accountId, bucketName, toBucket, objectName) => {
      const data = await apiRequest('PUT', `/object-storages/accounts/${accountId}/buckets/${bucketName}/move/${toBucket}/${objectName}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('mkdir')
    .description('Create a directory in a bucket')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<directory>', 'Directory name')
    .action(withAuth(async (opts, accountId, bucketName, directory) => {
      const data = await apiRequest('POST', `/object-storages/accounts/${accountId}/buckets/${bucketName}/objects/${directory}/`, { apiKey: opts.apiKey });
      output(data, opts);
    }));

  object
    .command('upload')
    .description('Upload an object (placeholder - multipart upload requires file handling)')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('[directory]', 'Target directory')
    .action(withAuth(async (opts, accountId, bucketName, directory) => {
      let url = `/object-storages/accounts/${accountId}/buckets/${bucketName}/upload`;
      if (directory) url += `/${directory}`;
      console.log('Upload endpoint:', url);
      console.log('Note: File upload requires multipart/form-data which is not yet supported via this CLI.');
      console.log('Use the API directly with a multipart POST request to the endpoint above.');
    }));

  object
    .command('set-acl')
    .description('Set ACL for an object or directory')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<path>', 'Object or directory path')
    .requiredOption('--acl <acl>', `Access control (${ACL_OPTIONS.join(', ')})`)
    .action(withAuth(async (opts, accountId, bucketName, objectPath) => {
      const data = await apiRequest('PUT', `/object-storages/accounts/${accountId}/buckets/${bucketName}/objects/${objectPath}`, {
        apiKey: opts.apiKey,
        body: { acl: opts.acl },
      });
      output(data, opts);
    }));

  object
    .command('delete')
    .description('Delete an object or directory')
    .argument('<account_id>', 'Account ID')
    .argument('<bucket_name>', 'Bucket name')
    .argument('<path>', 'Object or directory path')
    .action(withAuth(async (opts, accountId, bucketName, objectPath) => {
      const data = await apiRequest('DELETE', `/object-storages/accounts/${accountId}/buckets/${bucketName}/objects/${objectPath}`, { apiKey: opts.apiKey });
      output(data, opts);
    }));
}
