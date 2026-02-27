import { prisma } from '../../config/prisma';
import * as chatService from '../../modules/chat/chat.service';
import { runWithTenantContext } from '../../utils/tenant-context';
import { createConversation, createTenant, createUser } from '../helpers';

describe('Chat Integration', () => {
  it('sends a message in a valid tenant conversation', async () => {
    const tenant = await createTenant('Org Chat');
    const agent = await createUser({ tenantId: tenant.id, email: 'agent@chat.com' });
    const client = await createUser({ tenantId: tenant.id, email: 'client@chat.com' });
    const conversation = await createConversation(tenant.id, [agent.id, client.id]);

    const message = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id },
      () =>
        chatService.sendMessage({
          tenantId: tenant.id,
          userId: agent.id,
          conversationId: conversation.id,
          type: 'TEXT',
          content: 'Hello from agent'
        })
    );

    expect(message.content).toBe('Hello from agent');
    expect(message.conversationId).toBe(conversation.id);
  });

  it('prevents cross-tenant message access', async () => {
    const tenantA = await createTenant('Org A');
    const tenantB = await createTenant('Org B');

    const userA = await createUser({ tenantId: tenantA.id, email: 'a@org.com' });
    const userB = await createUser({ tenantId: tenantB.id, email: 'b@org.com' });

    const conversationA = await createConversation(tenantA.id, [userA.id]);

    await expect(
      runWithTenantContext({ tenantId: tenantB.id, userId: userB.id }, () =>
        chatService.sendMessage({
          tenantId: tenantB.id,
          userId: userB.id,
          conversationId: conversationA.id,
          type: 'TEXT',
          content: 'Cross-tenant attempt'
        })
      )
    ).rejects.toThrow('Access denied');
  });

  it('soft deletes messages', async () => {
    const tenant = await createTenant('Org Messages');
    const agent = await createUser({ tenantId: tenant.id, email: 'agent@react.com' });
    const client = await createUser({ tenantId: tenant.id, email: 'client@react.com' });
    const conversation = await createConversation(tenant.id, [agent.id, client.id]);

    const message = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id },
      () =>
        chatService.sendMessage({
          tenantId: tenant.id,
          userId: agent.id,
          conversationId: conversation.id,
          type: 'TEXT',
          content: 'Needs reaction'
        })
    );

    const deleted = await runWithTenantContext(
      { tenantId: tenant.id, userId: agent.id },
      () =>
        chatService.deleteMessage({
          tenantId: tenant.id,
          userId: agent.id,
          messageId: message.id
        })
    );

    expect(deleted.messageId).toBe(message.id);

    const stored = await prisma.message.findFirst({ where: { id: message.id } });
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.content).toBe('[deleted]');
  });

  it('adds and removes reactions on messages', async () => {
    const tenant = await createTenant('Org Reactions');
    const sender = await createUser({ tenantId: tenant.id, email: 'sender@react.com' });
    const receiver = await createUser({ tenantId: tenant.id, email: 'receiver@react.com' });
    const conversation = await createConversation(tenant.id, [sender.id, receiver.id]);

    const message = await runWithTenantContext(
      { tenantId: tenant.id, userId: sender.id },
      () =>
        chatService.sendMessage({
          tenantId: tenant.id,
          userId: sender.id,
          conversationId: conversation.id,
          type: 'TEXT',
          content: 'React to me'
        })
    );

    const added = await runWithTenantContext(
      { tenantId: tenant.id, userId: receiver.id },
      () =>
        chatService.addReaction({
          tenantId: tenant.id,
          userId: receiver.id,
          messageId: message.id,
          emoji: '👍'
        })
    );

    expect(added.messageId).toBe(message.id);
    expect(added.reactions).toHaveLength(1);
    expect(added.reactions[0].emoji).toBe('👍');

    const removed = await runWithTenantContext(
      { tenantId: tenant.id, userId: receiver.id },
      () =>
        chatService.removeReaction({
          tenantId: tenant.id,
          userId: receiver.id,
          messageId: message.id,
          emoji: '👍'
        })
    );

    expect(removed.reactions).toHaveLength(0);
  });
});
