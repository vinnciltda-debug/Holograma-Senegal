import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const filename = req.query.filename || 'model.glb';

    // O Vercel Blob aceita o 'req' (stream) diretamente no Node.js padrão
    const blob = await put(filename, req, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json(blob);
  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: error.message });
  }
}
