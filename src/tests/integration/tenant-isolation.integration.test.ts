import request from 'supertest';
import { createApp } from '../../app';
import { createConversation, createTenant, createUser, signUserToken } from '../helpers';

describe('Tenant Isolation Integration', () => {
  const app = createApp();

  it('returns only conversations from the authenticated tenant', async () => {
    const tenantA = await createTenant('Org A');
    const tenantB = await createTenant('Org B');

    const userA = await createUser({ tenantId: tenantA.id, email: 'agent@orga.com' });
    const userB = await createUser({ tenantId: tenantB.id, email: 'agent@orgb.com' });

    const conversationA = await createConversation(tenantA.id, [userA.id]);
    await createConversation(tenantB.id, [userB.id]);

    const tokenA = signUserToken({
      userId: userA.id,
      tenantId: tenantA.id,
      name: userA.name ?? 'Agent A',
      email: userA.email,
      status: userA.status ?? 'ACTIVE'
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(conversationA.id);
  });
});
