import { put } from '@vercel/blob';

// Configuração CRÍTICA para que a Vercel aceite o arquivo sem corromper
export const config = {
  api: {
    bodyParser: false, // Desliga o processamento automático para aceitar o "bruto" (stream)
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const filename = req.query.filename || 'modelo-google.glb';

    // O Vercel Blob consome o stream diretamente aqui
    const blob = await put(filename, req, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.status(200).json(blob);
  } catch (error) {
    console.error('Erro no upload Vercel:', error);
    return res.status(500).json({ error: 'Falha no servidor Vercel' });
  }
}
