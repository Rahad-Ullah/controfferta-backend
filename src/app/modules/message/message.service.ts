import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { Chat } from '../chat/chat.model';
import { Message } from './message.model';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { StatusCodes } from 'http-status-codes';

// ----------------- create message -------------------
export const createMessage = async (payload: IMessage): Promise<IMessage> => {
  // check if the chat exists and the sender is a participant
  const isChatExist = await Chat.findOne({
    _id: payload.chat,
    isDeleted: false,
    participants: { $in: [payload.sender] },
  });
  if (!isChatExist)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Chat not found or you are not a participant'
    );
  // check if content is provided
  if (!payload.content)
    throw new Error('Content is required');

  // mark sender as seen
  payload.seenBy = [payload.sender];

  const result = await Message.create(payload);
  const populatedResult = await result.populate('sender', 'name image isDeleted');

  // emit socket event for new message
  //@ts-ignore
  const io = global.io;
  if (io) {
    // 🔔 emit message to chat room
    io.to(`chat:${payload.chat}`).emit('getMessage', populatedResult);

    // 🔔 emit chat list update per participant
    isChatExist.participants.forEach(userId => {
      io.to(`user:${userId.toString()}`).emit('getChatList', populatedResult);
    });
  }

  // update the chat to sort it to the top
  await Chat.findByIdAndUpdate(payload.chat, {});

  return result;
};

// ----------------- get messages by chat id -------------------
export const getChatMessages = async (
  chatId: string,
  query: Record<string, any>,
  user: JwtPayload
) => {
  // check if the chat exists
  const existingChat = await Chat.findOne({
    _id: chatId,
    participants: { $in: [user?.id] },
  });
  if (!existingChat)
    throw new ApiError(401, 'Chat not found or you are not a participant');

  // update seen status those messages are not seen by the user
  await Message.updateMany(
    { chat: chatId, seenBy: { $nin: [user?.id] } },
    { $addToSet: { seenBy: user?.id } }
  );

  // get messages
  const MessageQuery = new QueryBuilder(
    Message.find({ chat: chatId })
      .populate('sender', 'name image isDeleted')
      .sort({ createdAt: -1 }),
    query
  )
    .paginate()
    .search(['content']);

  const [messages, pagination] = await Promise.all([
    MessageQuery.modelQuery.lean(),
    MessageQuery.getPaginationInfo(),
  ]);

  // add seen status to messages
  const messagesWithStatus = messages.map((message: any) => {
    return {
      ...message,
      isMyMessage: message.sender._id.toString() === user?.id,
      isSeen: message.seenBy?.length === existingChat?.participants?.length,
    };
  });

  return { messages: messagesWithStatus, pagination };
};

export const MessageServices = { createMessage, getChatMessages };
