export default async function handler(req, res) {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_osYCd9TScnyb93fh_VNZwyasVVwQIhS-DkwODKio_CdBWlQrO0m2fNYPPhpGu0SbgA/exec";

  const SECRET_PASSWORD = process.env.APP_PASSWORD;

  if (req.method !== 'POST') {
    return res.status(405).json({ status: "error", data: 'Método no permitido' });
  }

  const bodyData = req.body || {};
  const password = bodyData.password;
  delete bodyData.password; 

  if (!SECRET_PASSWORD) {
    return res.status(401).json({ status: "error", data: "Sistema no configurado: APP_PASSWORD ausente en Vercel." });
  }

  if (password !== SECRET_PASSWORD) {
    return res.status(401).json({ status: "error", data: "Contraseña incorrecta." });
  }

  try {
    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bodyData)
    });

    const textResponse = await googleResponse.text();
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (e) {
      return res.status(500).json({ status: "error", data: "Error leyendo datos de Google: " + textResponse.substring(0, 80) });
    }

    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ status: "error", data: "Fallo en el servidor: " + error.message });
  }
}
