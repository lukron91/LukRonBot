import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please add your Mongo URI to environment variables');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

const configSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '!' },
  language: { type: String, default: 'pl' },
  modules: {
    tickets: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    welcome: { type: Boolean, default: false },
    logs: { type: Boolean, default: false },
    automod: { type: Boolean, default: true },
  },
  tickets: {
    categoryId: String,
    logChannelId: String,
    transcriptChannelId: String,
    supportRoleId: String,
    ticketName: { type: String, default: 'ticket-{number}' },
    ticketLimit: { type: Number, default: 5 },
  },
  automod: {
    antiSpam: { type: Boolean, default: true },
    antiLinks: { type: Boolean, default: false },
    antiBadWords: { type: Boolean, default: true },
    spamThreshold: { type: Number, default: 5 },
    badWords: { type: [String], default: ['kurwa', 'chuj', 'pierdole'] },
  },
  welcome: {
    channelId: String,
    message: { type: String, default: 'Witaj {user} na serwerze {guild}!' },
  },
  logs: {
    channelId: String,
    logDeletes: { type: Boolean, default: true },
    logEdits: { type: Boolean, default: true },
    logJoins: { type: Boolean, default: true },
  },
});

const Config = mongoose.models.Config || mongoose.model('Config', configSchema);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
  }

  try {
    await dbConnect();
    const config = await Config.findOne({ guildId });

    return NextResponse.json(config || {
      guildId,
      prefix: '!',
      language: 'pl',
      modules: {
        tickets: true,
        moderation: true,
        welcome: false,
        logs: false,
        automod: true,
      },
      tickets: {
        categoryId: null,
        logChannelId: null,
        transcriptChannelId: null,
        supportRoleId: null,
        ticketName: 'ticket-{number}',
        ticketLimit: 5,
      },
      automod: {
        antiSpam: true,
        antiLinks: false,
        antiBadWords: true,
        spamThreshold: 5,
        badWords: ['kurwa', 'chuj', 'pierdole'],
      },
      welcome: {
        channelId: null,
        message: 'Witaj {user} na serwerze {guild}!',
      },
      logs: {
        channelId: null,
        logDeletes: true,
        logEdits: true,
        logJoins: true,
      },
    });
  } catch (error) {
    console.error('Config GET error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { guildId, config } = body;

  if (!guildId || !config) {
    return NextResponse.json({ error: 'Missing guildId or config' }, { status: 400 });
  }

  try {
    await dbConnect();
    await Config.findOneAndUpdate({ guildId }, config, { upsert: true, new: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
