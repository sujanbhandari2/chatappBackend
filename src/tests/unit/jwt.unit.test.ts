import { signToken, verifyToken } from '../../utils/jwt';

describe('JWT Unit', () => {
  it('signs and verifies token with tenant and identity payload', () => {
    const token = signToken({
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Agent One',
      email: 'agent1@example.com',
      status: 'ACTIVE'
    });

    const payload = verifyToken(token);

    expect(payload.userId).toBe('user-1');
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.name).toBe('Agent One');
    expect(payload.email).toBe('agent1@example.com');
    expect(payload.status).toBe('ACTIVE');
  });
});
