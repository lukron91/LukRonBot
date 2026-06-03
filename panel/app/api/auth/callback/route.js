import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('No access token:', tokenData);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const guildsData = await guildsResponse.json();

    const sessionData = JSON.stringify({
      userId: userData.id,
      username: userData.username,
      avatar: userData.avatar,
      email: userData.email,
      accessToken: tokenData.access_token,
      guilds: guildsData,
    });

    // Przekieruj na dashboard z danymi w hash URL
    const redirectUrl = new URL('/dashboard', request.url);
    redirectUrl.hash = btoa(encodeURIComponent(sessionData));
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
