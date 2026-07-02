import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';

export interface IUser {
  id: string;
  username: string;
  passwordHash: string;
  chips: number;
  createdAt: Date;
}

// Database representation interface
interface IUserRaw {
  _id: string;
  username: string;
  passwordHash: string;
  chips: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUserRaw>({
  _id: { type: String, default: () => crypto.randomUUID() },
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  chips: { type: Number, default: 1000 },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: true // Ensure 'id' virtual mapping to '_id' is generated
});

const UserModel = mongoose.model<IUserRaw>('User', UserSchema);

export const UserDb = {
  findOne: async (query: { username?: string; id?: string }): Promise<IUser | null> => {
    try {
      if (query.username) {
        const user = await UserModel.findOne({
          username: { $regex: new RegExp(`^${query.username}$`, 'i') }
        });
        return user ? (user.toJSON() as unknown as IUser) : null;
      }
      if (query.id) {
        const user = await UserModel.findById(query.id);
        return user ? (user.toJSON() as unknown as IUser) : null;
      }
      return null;
    } catch (error) {
      console.error('Error in UserDb.findOne:', error);
      return null;
    }
  },

  findById: async (id: string): Promise<IUser | null> => {
    try {
      const user = await UserModel.findById(id);
      return user ? (user.toJSON() as unknown as IUser) : null;
    } catch (error) {
      console.error('Error in UserDb.findById:', error);
      return null;
    }
  },

  create: async (username: string, passwordHash: string): Promise<IUser> => {
    const newUser = new UserModel({
      username,
      passwordHash,
      chips: 1000,
    });
    await newUser.save();
    return newUser.toJSON() as unknown as IUser;
  },

  updateChips: async (id: string, chips: number): Promise<IUser | null> => {
    try {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { chips },
        { new: true }
      );
      return user ? (user.toJSON() as unknown as IUser) : null;
    } catch (error) {
      console.error('Error in UserDb.updateChips:', error);
      return null;
    }
  }
};
