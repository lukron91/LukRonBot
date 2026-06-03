import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('LukRonBot');
    const config = await db.collection('configs').findOne({ guildId });

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
  } finally {
    await client.close();
  }
}

export async function POST(request) {
  const body = await request.json();
  const { guildId, config } = body;

  if (!guildId || !config) {
    return NextResponse.json({ error: 'Missing guildId or config' }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('LukRonBot');
    
    await db.collection('configs').updateOne(
      { guildId },
      { $set: config },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Config POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
