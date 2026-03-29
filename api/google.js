export default async function handler(req, res) {

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyI6gcaiR4mEKGP594j3meC4QFiaQcgvT-3Bq5djbA0k69P3FgwoWSvff5plzQv8icM/exec";

  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {

    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req.body)
    });

    const data = await googleResponse.json();

    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ status: "error", data: error.message });
  }
}
