import http from 'node:http';
import { AddressInfo } from 'node:net';
import { io as createClient, Socket } from 'socket.io-client';
import { createApp } from '../../app';
import { initializeSocketServer } from '../../websocket';
import { createConversation, createTenant, createUser, signUserToken } from '../helpers';

const waitForEvent = <T = any>(socket: Socket, event: string): Promise<T> =>
  new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });

const emitAck = <T = any>(socket: Socket, event: string, payload: unknown): Promise<T> =>
  new Promise((resolve, reject) => {
    socket.emit(event, payload, (response: { ok: boolean; data?: T; error?: string }) => {
      if (!response.ok) {
        reject(new Error(response.error ?? 'Socket event failed'));
        return;
      }

      resolve(response.data as T);
    });
  });

describe('Chat WebSocket events', () => {
  let httpServer: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    const app = createApp();
    httpServer = http.createServer(app);
    await initializeSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('sends, delivers, reads, and deletes messages', async () => {
    const tenant = await createTenant('Socket Org');
    const agent = await createUser({ tenantId: tenant.id, email: 'agent@socket.com', role: 'AGENT' });
    const client = await createUser({ tenantId: tenant.id, email: 'client@socket.com', role: 'CLIENT' });
    const conversation = await createConversation(tenant.id, [agent.id, client.id]);

    const agentToken = signUserToken({
      userId: agent.id,
      tenantId: tenant.id,
      role: agent.role,
      username: agent.username
    });

    const clientToken = signUserToken({
      userId: client.id,
      tenantId: tenant.id,
      role: client.role,
      username: client.username
    });

    const agentSocket = createClient(baseUrl, { auth: { token: agentToken }, transports: ['websocket'] });
    const clientSocket = createClient(baseUrl, { auth: { token: clientToken }, transports: ['websocket'] });

    await Promise.all([waitForEvent(agentSocket, 'connect'), waitForEvent(clientSocket, 'connect')]);

    await emitAck(agentSocket, 'join_conversation', { conversationId: conversation.id });
    await emitAck(clientSocket, 'join_conversation', { conversationId: conversation.id });

    const messageReceivedPromise = waitForEvent<any>(clientSocket, 'message_received');
    const sentMessage = await emitAck<any>(agentSocket, 'send_message', {
      conversationId: conversation.id,
      type: 'TEXT',
      content: 'Realtime hello'
    });

    const messageReceived = await messageReceivedPromise;
    expect(messageReceived.id).toBe(sentMessage.id);

    const reactionPromise = waitForEvent<any>(agentSocket, 'message_reacted');
    await emitAck(clientSocket, 'react_to_message', {
      messageId: sentMessage.id,
      reactionType: '👍'
    });

    const reaction = await reactionPromise;
    expect(reaction.messageId).toBe(sentMessage.id);

    const deliveredPromise = waitForEvent<any>(agentSocket, 'message_delivered');
    await emitAck(clientSocket, 'mark_as_delivered', { messageId: sentMessage.id });
    const deliveredReceipt = await deliveredPromise;
    expect(deliveredReceipt.messageId).toBe(sentMessage.id);

    const readPromise = waitForEvent<any>(agentSocket, 'message_read');
    await emitAck(clientSocket, 'mark_as_read', { messageId: sentMessage.id });
    const receipt = await readPromise;
    expect(receipt.messageId).toBe(sentMessage.id);

    const deletePromise = waitForEvent<any>(clientSocket, 'message_deleted');
    await emitAck(agentSocket, 'delete_message', { messageId: sentMessage.id });
    const deleted = await deletePromise;
    expect(deleted.messageId).toBe(sentMessage.id);

    agentSocket.disconnect();
    clientSocket.disconnect();
  });
});
