import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('LukRonBot');
    
    // Pobierz statystyki z kolekcji stats
    const stats = await db.collection('stats').findOne({ guildId });
    
    // Pobierz liczbę zapisanych konfiguracji (dla info)
    const config = await db.collection('configs').findOne({ guildId });
    
    return NextResponse.json(stats || {
      guildId,
      commandsUsed: 0,
      ticketsCreated: 0,
      messagesModerated: 0,
      usersProtected: 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// Endpoint dla bota do aktualizacji statystyk
export async function POST(request) {
  const body = await request.json();
  const { guildId, action } = body;

  if (!guildId || !action) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('LukRonBot');
    
    const update = {};
    
    switch(action) {
      case 'command':
        update.$inc = { commandsUsed: 1 };
        break;
      case 'ticket':
        update.$inc = { ticketsCreated: 1 };
        break;
      case 'moderation':
        update.$inc = { messagesModerated: 1 };
        break;
      case 'userProtected':
        update.$inc = { usersProtected: 1 };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    update.$set = { lastUpdated: new Date().toISOString() };
    
    await db.collection('stats').updateOne(
      { guildId },
      update,
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stats update error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
