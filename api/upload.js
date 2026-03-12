import { put } from '@vercel/blob';

// Removendo o 'edge' runtime para usar Node.js padrão (mais compatível)
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // No Node.js runtime da Vercel, o request é um stream amigável
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    const blob = await put(file.name || 'model.glb', file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
