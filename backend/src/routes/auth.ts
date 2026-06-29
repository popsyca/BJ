import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserDb } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretblackjackkey';

// Register
router.post('/register', async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
      return;
    }

    const existingUser = await UserDb.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await UserDb.create(username, passwordHash);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        chips: newUser.chips,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
      return;
    }

    const user = await UserDb.findOne({ username });
    if (!user) {
      res.status(400).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        chips: user.chips,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Yetkisiz.' });
      return;
    }

    const user = await UserDb.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      chips: user.chips,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// Claim free chips (if chips < 100)
router.post('/claim-chips', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Yetkisiz.' });
      return;
    }

    const user = await UserDb.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
      return;
    }

    if (user.chips >= 100) {
      res.status(400).json({ message: 'Bakiyeniz 100 çip veya daha fazlayken ücretsiz çip talep edemezsiniz.' });
      return;
    }

    const updatedUser = await UserDb.updateChips(user.id, user.chips + 500);

    res.json({
      message: '500 ücretsiz çip başarıyla yüklendi!',
      chips: updatedUser?.chips || user.chips + 500,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

export default router;
