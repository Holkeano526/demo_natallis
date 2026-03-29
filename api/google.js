export default async function handler(req, res) {
  // 🚨 PEGA AQUÍ TU URL DE APPS SCRIPT (Esta URL ya será invisible para los usuarios)
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5YK6IUsEUFwt96n3Biu2deVCm9wpsFQv8_kPsH-ELVfWxn9NAZoT820th_jv6QUnV/exec";

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
