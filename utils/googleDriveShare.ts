export async function shareFileWithUser(
  fileId: string,
  email: string,
  accessToken: string
) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: email,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }
}
