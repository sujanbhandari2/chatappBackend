import request from 'supertest';
import { createApp } from '../../app';
import { createTenant, createUser } from '../helpers';

describe('Auth Integration', () => {
  const app = createApp();

  it('returns a token for valid credentials', async () => {
    const tenant = await createTenant('Tenant A');
    await createUser({
      tenantId: tenant.id,
      email: 'agent@tenant-a.com'
    });

    const response = await request(app).post('/api/auth/login').send({
      tenantId: tenant.id,
      email: 'agent@tenant-a.com'
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.tenantId).toBe(tenant.id);
  });

  it('rejects invalid credentials', async () => {
    const tenant = await createTenant('Tenant B');
    await createUser({
      tenantId: tenant.id,
      email: 'client@tenant-b.com'
    });

    const response = await request(app).post('/api/auth/login').send({
      tenantId: tenant.id,
      email: 'nobody@tenant-b.com'
    });

    expect(response.status).toBe(401);
  });
});
