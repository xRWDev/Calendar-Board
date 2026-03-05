import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { ADMIN_COLOR, ADMIN_PASSWORD, ADMIN_USERNAME } from './config/auth.js';
import { UserModel } from './models/user.js';
import {
  DEFAULT_USER_COLOR,
  isDistinctColor,
  normalizeHex,
  pickUniqueColor,
} from './utils/colors.js';
import { isValidUsername } from './utils/validation.js';

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

const app = createApp();

const ensureAdminUser = async () => {
  const existing = await UserModel.findOne({ username: ADMIN_USERNAME });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  if (!existing) {
    await UserModel.create({
      username: ADMIN_USERNAME,
      passwordHash,
      role: 'admin',
      color: ADMIN_COLOR,
    });
    // eslint-disable-next-line no-console
    console.log('Admin user created');
    return;
  }
  if (
    existing.role !== 'admin' ||
    existing.color !== ADMIN_COLOR ||
    !(await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash))
  ) {
    existing.role = 'admin';
    existing.passwordHash = passwordHash;
    existing.color = ADMIN_COLOR;
    existing.username = ADMIN_USERNAME;
    await existing.save();
    // eslint-disable-next-line no-console
    console.log('Admin user updated');
  }
};

const ensureUserColors = async () => {
  const users = await UserModel.find().sort({ createdAt: 1 });
  const used = new Set<string>();
  used.add(ADMIN_COLOR);
  const defaultNormalized = normalizeHex(DEFAULT_USER_COLOR);

  for (const user of users) {
    if (user.role === 'admin') {
      if (user.color !== ADMIN_COLOR) {
        user.color = ADMIN_COLOR;
        await user.save();
      }
      continue;
    }
    const normalizedColor = user.color ? normalizeHex(user.color) : null;
    if (
      normalizedColor &&
      normalizedColor !== defaultNormalized &&
      isDistinctColor(normalizedColor, used)
    ) {
      used.add(normalizedColor);
      continue;
    }
    const color = pickUniqueColor(used);
    used.add(color);
    user.color = color;
    await user.save();
  }
};

const normalizeNickname = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  const cleaned = base.replace(/[^a-z0-9._-]/g, '');
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 20);
  }
  return `${cleaned}user`.slice(0, 20);
};

const makeUniqueNickname = (base: string, taken: Set<string>) => {
  let candidate = base;
  let counter = 1;
  while (taken.has(candidate) || !isValidUsername(candidate)) {
    const suffix = String(counter);
    const trimmedBase = base.slice(0, Math.max(1, 20 - suffix.length));
    candidate = `${trimmedBase}${suffix}`;
    counter += 1;
  }
  return candidate;
};

const migrateUsernames = async () => {
  const docs = await UserModel.collection.find({}).toArray();
  const taken = new Set<string>();

  docs.forEach((doc: any) => {
    const raw = typeof doc.username === 'string' ? doc.username.trim().toLowerCase() : '';
    if (raw) {
      taken.add(raw);
    }
  });

  for (const doc of docs) {
    const current =
      typeof doc.username === 'string' ? doc.username.trim().toLowerCase() : '';
    if (current && isValidUsername(current)) {
      continue;
    }
    const seed =
      typeof doc.email === 'string' && doc.email.trim().length > 0
        ? normalizeNickname(doc.email)
        : 'user';
    const unique = makeUniqueNickname(seed, taken);
    taken.add(unique);
    await UserModel.collection.updateOne(
      { _id: doc._id },
      { $set: { username: unique } }
    );
  }
};

const dropLegacyEmailIndex = async () => {
  const indexes = await UserModel.collection.indexes();
  const legacy = indexes.find((index) => index.key?.email === 1);
  if (legacy?.name) {
    await UserModel.collection.dropIndex(legacy.name);
    // eslint-disable-next-line no-console
    console.log('Dropped legacy email index');
  }
};

connectDb(MONGODB_URI)
  .then(() => {
    return dropLegacyEmailIndex().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to drop legacy email index', error);
    });
  })
  .then(() => {
    return migrateUsernames().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to migrate usernames', error);
    });
  })
  .then(() => {
    return ensureAdminUser().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to ensure admin user', error);
    });
  })
  .then(() => {
    return ensureUserColors().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to ensure user colors', error);
    });
  })
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
