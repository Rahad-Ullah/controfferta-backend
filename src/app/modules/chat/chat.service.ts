import { JwtPayload } from 'jsonwebtoken';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../message/message.model';
import { IMessage } from '../message/message.interface';
import { User } from '../user/user.model';
import { UserRole, UserStatus } from '../user/user.constant';

const canMessage = (left?: UserRole, right?: UserRole) => {
  const roles = new Set([left, right]);
  return roles.has(UserRole.Client) && roles.has(UserRole.Provider);
};

// ---------------- create chat ----------------
const createChatIntoDB = async (user: JwtPayload, payload: IChat) => {
  const otherIds = [
    ...new Set(
      payload.participants
        .map(participant => participant.toString())
        .filter(participant => participant !== user.id),
    ),
  ];
  if (otherIds.length !== 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'A chat can only include one other participant',
    );
  }

  const [otherId] = otherIds;
  const accounts = await User.find({
    _id: { $in: [user.id, otherId] },
  }).select('role status isDeleted');
  const caller = accounts.find(account => account._id.toString() === user.id);
  const other = accounts.find(account => account._id.toString() === otherId);
  if (!other || other.isDeleted || other.status !== UserStatus.Active) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Participant not found');
  }
  if (!canMessage(caller?.role, other.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot message this user');
  }

  const participants = [user.id, other._id];

  // create chat if it does not exist
  const isExist = await Chat.findOne({
    participants: { $all: participants, $size: 2 },
    isDeleted: false,
  }).lean();
  if (isExist) {
    return isExist;
  }

  const result = await Chat.create({ participants });
  return result;
};

// ---------------- delete chat ----------------
const deleteChatFromDB = async (chatId: string, userId: string) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found!');
  }

  const isParticipant = chat.participants.some(
    participant => participant.toString() === userId,
  );
  if (!isParticipant) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not a participant of this chat!',
    );
  }

  chat.isDeleted = true;
  await chat.save();
  return chat;
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
