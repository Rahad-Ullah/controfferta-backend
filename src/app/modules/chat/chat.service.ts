import { JwtPayload } from 'jsonwebtoken';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../message/message.model';
import { IMessage } from '../message/message.interface';

// ---------------- create chat ----------------
const createChatIntoDB = async (user: JwtPayload, payload: IChat) => {
  const participants = [...payload.participants];
  // push the user id to participants if not already included
  if (!participants.includes(user.id)) {
    participants.push(user.id);
  }

  // create chat if it does not exist
  const isExist = await Chat.findOne({
    participants: { $all: participants },
    isDeleted: false
  }).lean();
  if (isExist) {
    return isExist;
  }

  const result = await Chat.create({ participants });
  return result;
};

// ---------------- delete chat ----------------
const deleteChatFromDB = async (chatId: string) => {
  const isExist = await Chat.exists({ _id: chatId });
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found!');
  }

  const result = await Chat.findByIdAndUpdate(
    chatId,
    { isDeleted: true },
    { new: true }
  );
  return result;
};

// ---------------- get single chat by id ----------------
const getSingleChatFromDB = async (chatId: string, userId: string) => {
  const result = await Chat.findById(chatId).populate(
    'participants',
    'name image isOnline'
  );

  // check if the user is a participant
  if (
    !result?.participants?.find(
      (participant: any) => participant?._id.toString() === userId
    )
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not a participant of this chat!'
    );
  }

  if (result) {
    const anotherParticipant = result?.participants?.find(
      (participant: any) => participant?._id.toString() !== userId
    );
    return { ...result?.toObject(), anotherParticipant };
  }
  return null;
};

// ---------------- get my chats / get by id ----------------
const getMyChatsFromDB = async (
  user: JwtPayload,
  query: Record<string, any>
) => {
  const chats = await Chat.find({ participants: { $in: [user.id] }, isDeleted: false })
    .populate({
      path: 'participants',
      select: 'name image isOnline isDeleted',
      match: {
        // isDeleted: false,
        _id: { $ne: user.id }, // Exclude the current user from the populated participants
        ...(query?.searchTerm && {
          name: { $regex: query?.searchTerm, $options: 'i' },
        }),
      }, // Apply $regex only if search is valid },
    })
    .select('participants updatedAt')
    .sort('-updatedAt');

  // Filter out chats where no participants match the search (empty participants)
  const filteredChats = chats?.filter(
    (chat: any) => chat?.participants?.length > 0
  );

  //Use Promise.all to get the last message for each chat
  const chatList = await Promise.all(
    filteredChats?.map(async (chat: any) => {
      const data = chat?.toObject();

      const lastMessage: IMessage | null = await Message.findOne({
        chat: chat?._id,
      })
        .sort({ createdAt: -1 })
        .select('sender type content isDeleted createdAt');

      // find unread messages count
      const unreadCount = await Message.countDocuments({
        chat: chat?._id,
        seenBy: { $nin: [user.id] },
      });

      return {
        ...data,
        participants: data.participants,
        unreadCount: unreadCount || 0,
        lastMessage: lastMessage || null,
      };
    })
  );

  return chatList;
};

export const ChatServices = {
  createChatIntoDB,
  deleteChatFromDB,
  getSingleChatFromDB,
  getMyChatsFromDB,
};
