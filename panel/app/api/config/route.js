import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
const options = {};
let client;
let clientPromise;

if (!process.env.MONGODB_URI) throw new Error('Add MONGODB_URI to env');

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
  modules: { tickets: true, moderation: true, welcome: false, logs: false, automod: true },
  automod: { antiSpam: true, antiLinks: false, antiBadWords: true, spamThreshold: 5, badWords: ['kurwa', 'chuj'] }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('LukRonBot');
  const config = await db.collection('configs').findOne({ guildId });
  
  return NextResponse.json(config || { guildId, ...defaultConfig });
}

export async function POST(request) {
  const body = await request.json();
  const { guildId, config } = body;
  if (!guildId || !config) return NextResponse
