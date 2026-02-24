import request from 'supertest';
import { createApp } from '../../app';
import { createTenant, createUser } from '../helpers';

describe('Auth Integration', () => {
  const app = createApp();

  it('returns a token for valid credentials', async () => {
    const tenant = await createTenant('Tenant A');
    await createUser({
      tenantId: tenant.id,
      email: 'agent@tenant-a.com',
      role: 'AGENT',
      password: 'Password123!'
    });

    const response = await request(app).post('/api/auth/login').send({
      tenantId: tenant.id,
      email: 'agent@tenant-a.com',
      password: 'Password123!'
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.tenantId).toBe(tenant.id);
  });

  it('rejects invalid credentials', async () => {
    const tenant = await createTenant('Tenant B');
    await createUser({
      tenantId: tenant.id,
      email: 'client@tenant-b.com',
      role: 'CLIENT',
      password: 'Password123!'
    });

    const response = await request(app).post('/api/auth/login').send({
      tenantId: tenant.id,
      email: 'client@tenant-b.com',
      password: 'WrongPassword123!'
    });

    expect(response.status).toBe(401);
  });
});
