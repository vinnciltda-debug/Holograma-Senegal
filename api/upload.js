import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verificação de segurança para o Token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'TOKEN_NOT_FOUND: O Vercel Blob não está conectado ao seu projeto. Vá no painel da Vercel > Storage > Connect.' });
  }

  try {
    const filename = req.query.filename || 'modelo.glb';

    const blob = await put(filename, req, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json(blob);
  } catch (error) {
    console.error('Erro detalhado:', error.message);
    // Retornando o erro real da biblioteca da Vercel
    return res.status(500).json({ error: `VERCEL_BLOB_ERROR: ${error.message}` });
  }
}
