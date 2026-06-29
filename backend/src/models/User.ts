import fs from 'fs';
import path from 'path';

export interface IUser {
  id: string;
  username: string;
  passwordHash: string;
  chips: number;
  createdAt: Date;
}

const DB_FILE = path.resolve(__dirname, '../../db.json');

function readUsers(): IUser[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const users = JSON.parse(data || '[]');
    return users.map((u: any) => ({
      ...u,
      createdAt: new Date(u.createdAt)
    }));
  } catch (error) {
    console.error('Local DB read error, using empty array:', error);
    return [];
  }
}

function writeUsers(users: IUser[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Local DB write error:', error);
  }
}

export const UserDb = {
  findOne: async (query: { username?: string; id?: string }): Promise<IUser | null> => {
    const users = readUsers();
    if (query.username) {
      return users.find(u => u.username.toLowerCase() === query.username!.toLowerCase()) || null;
    }
    if (query.id) {
      return users.find(u => u.id === query.id) || null;
    }
    return null;
  },

  findById: async (id: string): Promise<IUser | null> => {
    const users = readUsers();
    return users.find(u => u.id === id) || null;
  },

  create: async (username: string, passwordHash: string): Promise<IUser> => {
    const users = readUsers();
    const newUser: IUser = {
      id: Math.random().toString(36).substring(2, 9),
      username,
      passwordHash,
      chips: 1000,
      createdAt: new Date(),
    };
    users.push(newUser);
    writeUsers(users);
    return newUser;
  },

  updateChips: async (id: string, chips: number): Promise<IUser | null> => {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;
    users[userIndex].chips = chips;
    writeUsers(users);
    return users[userIndex];
  }
};
