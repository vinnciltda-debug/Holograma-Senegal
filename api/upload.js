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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'TOKEN_NOT_FOUND: Conecte o Blob ao projeto no painel da Vercel.' });
  }

  try {
    const filename = req.query.filename || 'modelo.glb';

    // Tentando upload como public
    const blob = await put(filename, req, {
      access: 'public', // OBRIGATÓRIO para o QR Code funcionar
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json(blob);
  } catch (error) {
    if (error.message.includes('public access on a private store')) {
      return res.status(500).json({
        error: 'CONFIG_REQUIRED: Seu Blob está em modo PRIVADO. Mude para modo PÚBLICO no painel da Vercel (Storage > Blob > Settings) para que o QR Code funcione.'
      });
    }
    return res.status(500).json({ error: `ERRO: ${error.message}` });
  }
}
