import colors from 'colors';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import { logger } from '../shared/logger';
import { socketAuth } from '../app/middlewares/socketAuth';
import { User } from '../app/modules/user/user.model';
import { Chat } from '../app/modules/chat/chat.model';

// Type alias for Socket.IO acknowledgements
type AckCallback = (response: { success: boolean; message: string; data?: any }) => void;

const socket = (io: Server) => {
  // Authenticate using JWT auth middleware
  io.use(socketAuth);

  // Socket connection listener
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data?.userId?.toString();

    // Reject unauthorized or malformed connections
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      logger.error(`[Socket] Unauthorized or invalid userId on socket: ${socket.id}`);
      socket.emit('errorMessage', 'Unauthorized user ID');
      socket.disconnect(true);
      return;
    }

    logger.info(colors.blue(`User connected: ${userId}`));

    // Helper to send errors via both event emit and Ack callback
    const sendResponseError = (message: string, ack?: AckCallback) => {
      socket.emit('errorMessage', message);
      if (typeof ack === 'function') {
        ack({ success: false, message });
      }
    };

    // Helper to send success responses via Ack callback
    const sendResponseSuccess = (message: string, ack?: AckCallback, data?: any) => {
      if (typeof ack === 'function') {
        ack({ success: true, message, data });
      }
    };

    // Join personal user room for targeting specific users
    socket.join(`user:${userId}`);

    // Update user online status
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch (err) {
      logger.error(`[Socket] Error setting online status for user ${userId}:`, err);
    }

    // ----- JOIN CHAT ROOM -----
    socket.on('room:join', async (payload: any, ack?: AckCallback) => {
      try {
        // Support both string payload ('6a64...') and object payload ({ chatId: '6a64...' })
        const chatId = typeof payload === 'object' ? payload?.chatId : payload;

        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
          return sendResponseError('Invalid chatId format', ack);
        }

        const chat = await Chat.exists({
          _id: chatId,
          isDeleted: false,
          participants: userId, // Mongoose handles implicit array searching
        });

        if (!chat) {
          return sendResponseError('Chat not found or you are not a participant of this chat!', ack);
        }

        socket.join(`chat:${chatId}`);
        logger.info(colors.blue(`User:${userId} joined chat:${chatId}`));

        sendResponseSuccess(`Successfully joined chat:${chatId}`, ack);
      } catch (error) {
        logger.error(`[Socket] Unhandled error in room:join for user ${userId}:`, error);
        sendResponseError('Internal server error while joining room', ack);
      }
    });

    // ----- LEAVE CHAT ROOM -----
    socket.on('room:leave', (payload: any, ack?: AckCallback) => {
      try {
        const chatId = typeof payload === 'object' ? payload?.chatId : payload;

        if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
          return sendResponseError('Invalid chatId format', ack);
        }

        socket.leave(`chat:${chatId}`);
        logger.info(colors.yellow(`User:${userId} left chat:${chatId}`));

        sendResponseSuccess(`Successfully left chat:${chatId}`, ack);
      } catch (error) {
        logger.error(`[Socket] Unhandled error in room:leave for user ${userId}:`, error);
        sendResponseError('Internal server error while leaving room', ack);
      }
    });

    // ----- DISCONNECT -----
    socket.on('disconnect', async () => {
      try {
        // Check if user still has other active sockets (e.g. active tabs/devices)
        const activeSockets = await io.in(`user:${userId}`).fetchSockets();

        if (activeSockets.length === 0) {
          await User.findByIdAndUpdate(userId, { isOnline: false });
        }

        logger.info(colors.red(`User disconnected: ${userId}`));
      } catch (err) {
        logger.error(`[Socket] Error on disconnect for user ${userId}:`, err);
      }
    });
  });
};

export const socketHelper = { socket };