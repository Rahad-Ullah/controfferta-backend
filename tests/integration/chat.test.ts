import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { MessageType } from '../../src/app/modules/message/message.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Chat and messages', () => {
  it('shows a chat only to its participants', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' });
    const friend = await createTestUser({ email: 'friend@example.com' });
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
  });
});
