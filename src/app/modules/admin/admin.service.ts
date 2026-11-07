import mongoose from 'mongoose';
import { UserRole, UserStatus } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { IAdmin } from './admin.interface';
import { Admin } from './admin.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// -------------- create admin --------------
const createAdmin = async (payload: IUser & IAdmin): Promise<any> => {
  // check if user already exists
  const existingUser = await User.exists({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already exists');
  }

  const { permissions, name, ...userData } = payload as IUser &
    IAdmin & { name?: string };

  const trimmedName = String(name || '').trim();
  const [firstName, ...restName] = trimmedName.split(/\s+/);
  userData.firstName = firstName;
  userData.lastName = restName.join(' ') || firstName;

  userData.role = UserRole.Admin;
  userData.isEmailVerified = true;
  userData.status = UserStatus.Active;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step A: Create the base User document within the transaction
    const [newUser] = await User.create([userData], { session });

    if (!newUser) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create user profile',
      );
    }

    // Step B: Formulate the Admin data pointing back to the created user's ID
    const adminData = {
      user: newUser._id,
      permissions: permissions || [],
    };

    // Step C: Create the Admin profile document within the transaction
    const [newAdmin] = await Admin.create([adminData], { session });

    if (!newAdmin) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create admin profile',
      );
    }

    // Step D: Update the original User document to store the reference to the Admin document
    await User.findByIdAndUpdate(
      newUser._id,
      {
        $set: { roleRef: newAdmin._id },
      },
      {
        session,
      },
    );

    // Everything succeeded; lock it in!
    await session.commitTransaction();

    return newAdmin;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

// -------------- update admin --------------
const updateAdmin = async (
  userId: string,
  payload: Partial<IAdmin> & Partial<IUser>,
): Promise<any> => {
  const { permissions, ...userData } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Step A: If there are user fields to update, execute the User update
    if (Object.keys(userData).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        userId, // The referenced userId
        { $set: userData },
        { new: true, runValidators: true, session },
      );

      if (!updatedUser) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update associated user profile',
        );
      }

      user = updatedUser;
    }

    // Step B: If there are admin fields to update (permissions), execute Admin update
    if (Array.isArray(permissions)) {
      const updatedAdmin = await Admin.findByIdAndUpdate(
        user.roleRef,
        { $set: { permissions } },
        { new: true, runValidators: true, session },
      );

      if (!updatedAdmin) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to update associated admin profile',
        );
      }
    }

    await user.populate({ path: 'roleRef', options: { session } });

    // Everything went smoothly, commit the changes
    await session.commitTransaction();

    return user;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export const AdminServices = {
  createAdmin,
  updateAdmin,
};
