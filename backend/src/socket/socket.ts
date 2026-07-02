import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Table } from '../game/Table';
import { UserDb } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    const value = parts.join('=')?.trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  });
  return list;
}

// Keep track of private tables per userId
const activeTables: Record<string, Table> = {};

export function initSockets(io: Server) {
  
  // Socket authentication middleware
  io.use(async (socket: Socket & { userId?: string; username?: string }, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const token = cookies.token || socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string; username: string };
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket & { userId?: string; username?: string }) => {
    const userId = socket.userId!;
    const username = socket.username!;
    
    console.log(`User connected to socket: ${username} (${userId})`);

    // Put socket in its own private room
    const privateRoom = `room_${userId}`;
    socket.join(privateRoom);

    // Get or create player's private table
    let table = activeTables[userId];
    if (!table) {
      try {
        const user = await UserDb.findById(userId);
        const initialChips = user ? user.chips : 1000;
        
        table = new Table(
          userId,
          `${username} Masası`,
          // onStateChange
          (updatedTable) => {
            io.to(privateRoom).emit('table_update', updatedTable.toJSON());
          },
          // onBalanceUpdate
          async (uId, newChips) => {
            try {
              await UserDb.updateChips(uId, newChips);
              socket.emit('balance_update', { chips: newChips });
            } catch (err) {
              console.error('Error updating user chips in DB:', err);
            }
          }
        );
        activeTables[userId] = table;
        table.addPlayer(userId, username, initialChips, socket.id);
      } catch (err) {
        console.error('Error initializing user table:', err);
      }
    } else {
      // Reconnected, update socket ID
      table.updateSocketId(userId, socket.id);
    }

    // Automatically send initial state on join request
    socket.on('join_game', async () => {
      if (table) {
        // Refresh chips balance from DB just in case
        const user = await UserDb.findById(userId);
        if (user && table.seat) {
          table.seat.chips = user.chips;
        }
        socket.emit('table_update', table.toJSON());
      }
    });

    // Place bet
    socket.on('place_bet', ({ amount }: { amount: number }) => {
      if (table) {
        const success = table.placeBet(socket.id, amount);
        if (!success) {
          socket.emit('error_message', 'Bahis yapılamadı (bakiye yetersiz veya oyun başladı).');
        }
      }
    });

    // Game action: Hit
    socket.on('game_action_hit', () => {
      if (table) {
        table.hit(socket.id);
      }
    });

    // Game action: Stand
    socket.on('game_action_stand', () => {
      if (table) {
        table.stand(socket.id);
      }
    });

    // Game action: Double Down
    socket.on('game_action_double', () => {
      if (table) {
        const success = table.doubleDown(socket.id);
        if (!success) {
          socket.emit('error_message', 'Double down yapılamadı (sadece ilk iki kartta yapılabilir veya bakiye yetersiz).');
        }
      }
    });

    // Game action: Split
    socket.on('game_action_split', () => {
      if (table) {
        const success = table.split(socket.id);
        if (!success) {
          socket.emit('error_message', 'Bölme (Split) işlemi yapılamadı (kartlar çift olmalı veya bakiye yetersiz).');
        }
      }
    });

    // Game action: Buy Insurance
    socket.on('buy_insurance', ({ accept }: { accept: boolean }) => {
      if (table) {
        table.buyInsurance(socket.id, accept);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${username}`);
      // In single-player, we don't automatically remove them from the table,
      // so if they refresh, their cards and game session remain intact!
    });
  });
}
