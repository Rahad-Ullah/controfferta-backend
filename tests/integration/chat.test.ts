import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { MessageType } from '../../src/app/modules/message/message.constant';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { Chat } from '../../src/app/modules/chat/chat.model';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Chat and messages', () => {
  it('shows a chat only to its participants', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' });
    const friend = await createTestUser({
      email: 'friend@example.com',
      role: UserRole.Provider,
    });
    const stranger = await createTestUser({ email: 'stranger@example.com' });

    const created = await request(app)
      .post('/api/v1/chats/create')
      .set('Authorization', authHeader(owner.token))
      .send({ participants: [friend.user._id.toString()] });

    expect(created.status).toBe(200);
    const chatId = created.body.data._id;

    const ownerChats = await request(app)
      .get('/api/v1/chats/me')
      .set('Authorization', authHeader(owner.token));
    expect(ownerChats.status).toBe(200);
    expect(ownerChats.body.data.map((chat: { _id: string }) => chat._id)).toContain(
      chatId,
    );

    const strangerChats = await request(app)
      .get('/api/v1/chats/me')
      .set('Authorization', authHeader(stranger.token));
    expect(strangerChats.body.data).toEqual([]);

    const message = await request(app)
      .post('/api/v1/messages/create')
      .set('Authorization', authHeader(owner.token))
      .send({
        chat: chatId,
        type: MessageType.Text,
        text: 'Hello there',
      });
    expect(message.status).toBe(201);
    expect(message.body.data.content).toBe('Hello there');

    const messages = await request(app)
      .get(`/api/v1/messages/chat/${chatId}`)
      .set('Authorization', authHeader(friend.token));
    expect(messages.status).toBe(200);
    expect(messages.body.data).toHaveLength(1);

    const hidden = await request(app)
      .get(`/api/v1/messages/chat/${chatId}`)
      .set('Authorization', authHeader(stranger.token));
    expect(hidden.status).toBe(401);

    const strangerDelete = await request(app)
      .delete(`/api/v1/chats/${chatId}`)
      .set('Authorization', authHeader(stranger.token));
    expect(strangerDelete.status).toBe(400);
    expect(strangerDelete.body.success).toBe(false);
    expect(strangerDelete.body.message).toBe(
      'You are not a participant of this chat!',
    );
    expect(await Chat.exists({ _id: chatId, isDeleted: false })).toBeTruthy();

    const ownerDelete = await request(app)
      .delete(`/api/v1/chats/${chatId}`)
      .set('Authorization', authHeader(owner.token));
    expect(ownerDelete.status).toBe(200);
    expect(await Chat.exists({ _id: chatId, isDeleted: true })).toBeTruthy();
  });

  it('only lets a client and a provider open a chat', async () => {
    const client = await createTestUser({ email: 'client@example.com' });
    const otherClient = await createTestUser({
      email: 'other.client@example.com',
    });
    const provider = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const otherProvider = await createTestUser({
      email: 'other.provider@example.com',
      role: UserRole.Provider,
    });

    const sameRole = await request(app)
      .post('/api/v1/chats/create')
      .set('Authorization', authHeader(client.token))
      .send({ participants: [otherClient.user._id.toString()] });
    expect(sameRole.status).toBe(403);
    expect(sameRole.body.success).toBe(false);
    expect(sameRole.body.message).toBe('You cannot message this user');

    const providers = await request(app)
      .post('/api/v1/chats/create')
      .set('Authorization', authHeader(provider.token))
      .send({ participants: [otherProvider.user._id.toString()] });
    expect(providers.status).toBe(403);
    expect(providers.body.message).toBe('You cannot message this user');

    const missing = await request(app)
      .post('/api/v1/chats/create')
      .set('Authorization', authHeader(client.token))
      .send({ participants: ['64b000000000000000000001'] });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('Participant not found');

    const allowed = await request(app)
      .post('/api/v1/chats/create')
      .set('Authorization', authHeader(provider.token))
      .send({ participants: [client.user._id.toString()] });
    expect(allowed.status).toBe(200);
    expect(await Chat.countDocuments()).toBe(1);
  });
});
