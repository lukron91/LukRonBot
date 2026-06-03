import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const options = {};
let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to environment variables');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

const defaultConfig = {
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
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('LukRonBot');
    const config = await db.collection('configs').findOne({ guildId });

    return NextResponse.json(config || { guildId, ...defaultConfig });
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
    const mongoClient = await clientPromise;
    const db = mongoClient.db('LukRonBot');
    
    await db.collection('configs').updateOne(
      { guildId },
      { $set: config },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
