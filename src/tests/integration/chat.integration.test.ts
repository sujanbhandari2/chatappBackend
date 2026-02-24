import { prisma } from '../../config/prisma';
import * as chatService from '../../modules/chat/chat.service';
import { runWithTenantContext } from '../../utils/tenant-context';
import { createConversation, createTenant, createUser } from '../helpers';

describe('Chat Integration', () => {
  it('sends a message in a valid tenant conversation', async () => {
    const tenant = await createTenant('Org Chat');
    const agent = await createUser({ tenantId: tenant.id, email: 'agent@chat.com', role: 'AGENT' });
    const client = await createUser({ tenantId: tenant.id, email: 'client@chat.com', role: 'CLIENT' });
    const conversation = await createConversation(tenant.id, [agent.id, client.id]);

    const message = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id, role: 'AGENT' },
      () =>
        chatService.sendMessage({
          tenantId: tenant.id,
          userId: agent.id,
          role: 'AGENT',
          conversationId: conversation.id,
          type: 'TEXT',
          content: 'Hello from agent'
        })
    );

    expect(message.content).toBe('Hello from agent');
    expect(message.tenantId).toBe(tenant.id);
  });

  it('prevents cross-tenant message access', async () => {
    const tenantA = await createTenant('Org A');
    const tenantB = await createTenant('Org B');

    const userA = await createUser({ tenantId: tenantA.id, email: 'a@org.com', role: 'CLIENT' });
    const userB = await createUser({ tenantId: tenantB.id, email: 'b@org.com', role: 'CLIENT' });

    const conversationA = await createConversation(tenantA.id, [userA.id]);

    await expect(
      runWithTenantContext({ tenantId: tenantB.id, userId: userB.id, role: 'CLIENT' }, () =>
        chatService.sendMessage({
          tenantId: tenantB.id,
          userId: userB.id,
          role: 'CLIENT',
          conversationId: conversationA.id,
          type: 'TEXT',
          content: 'Cross-tenant attempt'
        })
      )
    ).rejects.toThrow('Access denied');
  });

  it('upserts reactions and soft deletes messages', async () => {
    const tenant = await createTenant('Org Reactions');
    const agent = await createUser({ tenantId: tenant.id, email: 'agent@react.com', role: 'AGENT' });
    const client = await createUser({ tenantId: tenant.id, email: 'client@react.com', role: 'CLIENT' });
    const conversation = await createConversation(tenant.id, [agent.id, client.id]);

    const message = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id, role: 'AGENT' },
      () =>
        chatService.sendMessage({
          tenantId: tenant.id,
          userId: agent.id,
          role: 'AGENT',
          conversationId: conversation.id,
          type: 'TEXT',
          content: 'Needs reaction'
        })
    );

    const firstReaction = await runWithTenantContext(
      { tenantId: tenant.id, userId: client.id, role: 'CLIENT' },
      () =>
        chatService.reactToMessage({
          tenantId: tenant.id,
          userId: client.id,
          role: 'CLIENT',
          messageId: message.id,
          reactionType: '👍'
        })
    );

    expect(firstReaction.reactionType).toBe('👍');

    const updatedReaction = await runWithTenantContext(
      { tenantId: tenant.id, userId: client.id, role: 'CLIENT' },
      () =>
        chatService.reactToMessage({
          tenantId: tenant.id,
          userId: client.id,
          role: 'CLIENT',
          messageId: message.id,
          reactionType: '❤️'
        })
    );

    expect(updatedReaction.reactionType).toBe('❤️');

    const deleted = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id, role: 'AGENT' },
      () =>
        chatService.deleteMessage({
          tenantId: tenant.id,
          userId: agent.id,
          role: 'AGENT',
          messageId: message.id
        })
    );

    expect(deleted.messageId).toBe(message.id);

    const stored = await prisma.message.findFirst({ where: { id: message.id, tenantId: tenant.id } });
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.content).toBe('[deleted]');
  });
});
