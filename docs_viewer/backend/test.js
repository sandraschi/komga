const request = require('supertest');
const app = require('./index');

// Jest test setup - these globals are provided by Jest test environment
/* global describe, it, expect, jest */

// Add a timeout for tests that might take longer
jest.setTimeout(30000); // 30 seconds

describe('docs_viewer backend', () => {
  it('should return ok for health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return a file tree for the default docs folder', async () => {
    const res = await request(app).get('/api/tree');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  describe('/api/tree', () => {
    it('should return a valid file tree', async () => {
      const res = await request(app).get('/api/tree');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // At least one folder or file
      expect(res.body.length).toBeGreaterThan(0);
      // Check structure of first node
      const node = res.body[0];
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('path');
      if (node.type === 'folder') {
        expect(Array.isArray(node.children)).toBe(true);
      }
    });
  });

  describe('/api/llm/models', () => {
    it('should return a valid model list for ollama', async () => {
      const res = await request(app).get('/api/llm/models?backend=ollama');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('models');
      expect(Array.isArray(res.body.models)).toBe(true);
    });
    it('should return a valid model list for lmstudio', async () => {
      const res = await request(app).get('/api/llm/models?backend=lmstudio');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('models');
      expect(Array.isArray(res.body.models)).toBe(true);
    });
  });

  // TODO: Add tests for file content, metadata CRUD, search, error cases, etc.
}); 