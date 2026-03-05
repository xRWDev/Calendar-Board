import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.js';
import { ADMIN_COLOR, ADMIN_USERNAME } from '../config/auth.js';
import {
  DEFAULT_USER_COLOR,
  MIN_COLOR_DISTANCE,
  isDistinctColor,
  normalizeHex,
  pickUniqueColor,
} from '../utils/colors.js';
import { isValidPassword, isValidUsername } from '../utils/validation.js';

export const authRouter = express.Router();

const signToken = (userId: string, username: string, role: 'user' | 'admin') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({ sub: userId, username, role }, secret, { expiresIn: '7d' });
};

authRouter.post('/register', async (req, res) => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  if (!isValidUsername(username) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const existing = await UserModel.findOne({ username: normalizedUsername }).lean();
  if (existing) {
    return res.status(409).json({ error: 'Username already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const usedColors = new Set(
    (await UserModel.find({}, 'color').lean())
      .map((user) => user.color)
      .filter((color): color is string => Boolean(color))
      .map((color) => normalizeHex(color))
      .filter((color): color is string => Boolean(color))
  );
  usedColors.add(ADMIN_COLOR);
  let color = pickUniqueColor(usedColors);
  const normalizedDefault = normalizeHex(DEFAULT_USER_COLOR);
  if (normalizedDefault && normalizeHex(color) === normalizedDefault) {
    color = pickUniqueColor(usedColors, Math.max(40, MIN_COLOR_DISTANCE - 40));
  }
  const user = await UserModel.create({
    username: normalizedUsername,
    passwordHash,
    role: 'user',
    color,
  });
  const token = signToken(user.id, user.username, user.role ?? 'user');

  return res.status(201).json({ token, user: user.toJSON() });
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  const normalizedUsername =
    typeof username === 'string' ? username.trim().toLowerCase() : '';
  const passwordValue = typeof password === 'string' ? password : '';
  const isAdminLogin = normalizedUsername === ADMIN_USERNAME;
  if (
    (!isAdminLogin && !isValidUsername(username)) ||
    (!isAdminLogin && !isValidPassword(password)) ||
    (isAdminLogin && passwordValue.length === 0)
  ) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const user = await UserModel.findOne({ username: normalizedUsername });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  {
    const usedColors = new Set(
      (await UserModel.find({ _id: { $ne: user._id } }, 'color').lean())
        .map((entry) => entry.color)
        .filter((color): color is string => Boolean(color))
        .map((color) => normalizeHex(color))
        .filter((color): color is string => Boolean(color))
    );
    usedColors.add(ADMIN_COLOR);
    const normalizedDefault = normalizeHex(DEFAULT_USER_COLOR);
    const normalizedCurrent = user.color ? normalizeHex(user.color) : null;
    const needsColor =
      !normalizedCurrent ||
      (normalizedDefault && normalizedCurrent === normalizedDefault) ||
      !isDistinctColor(normalizedCurrent, usedColors);
    if (needsColor) {
      let nextColor = pickUniqueColor(usedColors);
      if (normalizedDefault && normalizeHex(nextColor) === normalizedDefault) {
        nextColor = pickUniqueColor(usedColors, Math.max(40, MIN_COLOR_DISTANCE - 40));
      }
      user.color = nextColor;
      await user.save();
    }
  }

  const ok = await bcrypt.compare(passwordValue, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user.id, user.username, user.role ?? 'user');
  return res.json({ token, user: user.toJSON() });
});
