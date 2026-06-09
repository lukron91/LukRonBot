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
  console.log('[CALLBACK] token response status:', tokenRes.status);
  console.log('[CALLBACK] token data:', JSON.stringify(tokenData));
  if (!tokenData.access_token) {
    console.log('[CALLBACK] BRAK access_token, redirecting to error');
    return NextResponse.redirect(new URL('/?error=token', request.url));
  }

  // Pobranie danych użytkownika i serwerów
  const [userRes, guildsRes] = await Promise.all([
    fetch('https://discord.com/api/users/@me', { 
      headers: { Authorization: `Bearer ${tokenData.access_token}` } 
    }),
    fetch('https://discord.com/api/users/@me/guilds', { 
      headers: { Authorization: `Bearer ${tokenData.access_token}` } 
    }),
  ]);

  const user = await userRes.json();
  let guilds = await guildsRes.json();

  // Zachowaj wszystkie gildie — filtrowanie będzie po stronie panelu
  const sessionData = {
    userId: user.id,
    username: user.username,
    global_name: user.global_name,
    avatar: user.avatar,
    email: user.email,
    guilds: Array.isArray(guilds) ? guilds : [],
  };

  // Zwracamy HTML który zapisze sesję w localStorage i przekieruje
  const sessionJson = JSON.stringify(sessionData);
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Logowanie...</title></head>
<body>
<script>
  localStorage.setItem('session', '${sessionJson.replace(/'/g, "\\'")}');
  window.location.href = '/';
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}