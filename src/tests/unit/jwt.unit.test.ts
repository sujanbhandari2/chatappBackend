import { signToken, verifyToken } from '../../utils/jwt';

describe('JWT Unit', () => {
  it('signs and verifies token with tenant and role payload', () => {
    const token = signToken({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'AGENT',
      username: 'agent_1'
    });

    const payload = verifyToken(token);

    expect(payload.userId).toBe('user-1');
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.role).toBe('AGENT');
    expect(payload.username).toBe('agent_1');
  });
});
