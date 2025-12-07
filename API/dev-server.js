/**
 * Dev-only server to serve the playground page and stub API calls.
 * Swap the mockClient implementations with real library calls as they are added.
 */
const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const playgroundDir = path.join(__dirname, 'dev-playground');

// Simple mock client to be replaced by real implementations.
const mockClient = {
  async getItems() {
    return [{ id: 'item-1', name: 'Sample Item', price: 12.99 }];
  },
  async getDeliveries() {
    return [{ id: 'del-1', status: 'pending', eta: '2024-12-31' }];
  },
  async getInventory() {
    return [{ sku: 'sku-1', quantity: 3 }];
  }
};

app.use(express.json());
app.use(express.static(playgroundDir));

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/items', async (_req, res) => {
  const items = await mockClient.getItems();
  res.json({ items });
});

app.get('/api/deliveries', async (_req, res) => {
  const deliveries = await mockClient.getDeliveries();
  res.json({ deliveries });
});

app.get('/api/inventory', async (_req, res) => {
  const inventory = await mockClient.getInventory();
  res.json({ inventory });
});

app.listen(port, () => {
  console.log(`Dev playground server running at http://localhost:${port}`);
});
