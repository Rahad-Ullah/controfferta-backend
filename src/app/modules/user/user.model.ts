import bcrypt from 'bcrypt';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import { IUser, UserModal } from './user.interface';
import { UserRole, UserStatus } from './user.constant';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';

const userSchema = new Schema<IUser, UserModal>(
  {
    uid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    roleRef: {
      type: Schema.Types.ObjectId,
      refPath: 'roleModel',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
      minlength: 8,
    },
    image: {
      type: String,
      default: '',
    },
    phone: {
      countryCode: {
        type: String,
        default: '',
      },
      number: {
        type: String,
        default: '',
      },
    },
    address: {
      line1: {
        type: String,
        default: '',
      },
      line2: {
        type: String,
        default: '',
      },
      city: {
        type: String,
        default: '',
      },
      state: {
        type: String,
        default: '',
      },
      country: {
        type: String,
        default: '',
      },
      postalCode: {
        type: String,
        default: '',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.Active,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isNotificationEnabled: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },
  },
  { timestamps: true },
);

// 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

// virtual field
userSchema.virtual('roleModel').get(function () {
  if (!this.role) return null;

  // Converts snake_case ('super_admin') to PascalCase ('SuperAdmin')
  return this.role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
});

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

// password hash
userSchema.pre('save', async function (next) {
  // check if password not exist or password not modified in this call
  if (!this.password) return next();
  if (!this.isModified('password')) return next();
  //password hash
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
  next();
});

// auto increment uid
userSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'USR',
  counterId: 'user_sequence',
  padLength: 6,
});

export const User = model<IUser, UserModal>('User', userSchema);
