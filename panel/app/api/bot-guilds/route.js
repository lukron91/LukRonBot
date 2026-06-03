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

export async function GET() {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('LukRonBot');
    
    // Pobierz wszystkie guildId z kolekcji configs
    const configs = await db.collection('configs').find({}).toArray();
    const guildIds = configs.map(config => config.guildId);
    
    return NextResponse.json({ guilds: guildIds });
  } catch (error) {
    console.error('Error fetching bot guilds:', error);
    return NextResponse.json({ guilds: [] });
  }
}
