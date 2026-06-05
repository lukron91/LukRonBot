import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Wymiana kodu na token
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL('/?error=token', request.url));
  }

  // Pobranie danych użytkownika i serwerów
  const [userRes, guildsRes] = await Promise.all([
    fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } }),
    fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${tokenData.access_token}` } }),
  ]);
  const user = await userRes.json();
  let guilds = await guildsRes.json();
  if (Array.isArray(guilds)) {
    guilds = guilds.filter(g => {
      const perms = BigInt(g.permissions);
      return (perms & 0x8n) !== 0n || (perms & 0x20n) !== 0n;
    });
  }

  const sessionData = {
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    email: user.email,
    guilds,
  };
  const sessionJson = JSON.stringify(sessionData);

  // Przekierowanie na stronę główną z danymi w parametrze URL
  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('session', sessionJson);
  return NextResponse.redirect(redirectUrl);
}