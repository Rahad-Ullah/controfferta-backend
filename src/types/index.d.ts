import { JwtPayload } from 'jsonwebtoken';
import { Server } from 'socket.io';

declare global {
  // Ambient global bindings are declared with var.
  // eslint-disable-next-line no-var
  var io: Server | undefined;

  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
