export default async function handler(req, res) {
  // 🚨 PEGA AQUÍ LA URL DE TU "NUEVA IMPLEMENTACIÓN" DE APPS SCRIPT
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyI6gcaiR4mEKGP594j3meC4QFiaQcgvT-3Bq5djbA0k69P3FgwoWSvff5plzQv8icM/exec";

  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // El servidor de Vercel hace la petición a Google (Adiós CORS)
    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req.body)
    });

    const data = await googleResponse.json();
    
    // Devolvemos la respuesta de Google a nuestra página web
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ status: "error", data: error.message });
  }
}
