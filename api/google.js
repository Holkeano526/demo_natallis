export default async function handler(req, res) {
  // 1. PEGA AQUÍ LA URL QUE ACABAS DE COPIAR
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxH5YvXMsQSmIFoH0LjjsY0ZWjMfTL7NMmu3fGgqLZ363_5IrvSFZ_JJHXHJZYqjh8kpQ/exec";

  const SECRET_PASSWORD = process.env.APP_PASSWORD;

  if (req.method !== 'POST') {
    return res.status(405).json({ status: "error", data: 'Método no permitido' });
  }

  const bodyData = req.body || {};
  const password = bodyData.password;
  delete bodyData.password; 

  if (!SECRET_PASSWORD) {
    return res.status(401).json({ status: "error", data: "Falta configurar APP_PASSWORD en Vercel." });
  }

  // Validación de la nueva contraseña
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
    
    try {
      // Si Google responde bien, esto será JSON
      const data = JSON.parse(textResponse);
      return res.status(200).json(data);
    } catch (e) {
      // Si entra aquí, es porque Google envió el HTML de login
      return res.status(500).json({ 
        status: "error", 
        data: "Permisos insuficientes: Configura el Script de Google para acceso de 'Cualquier persona'." 
      });
    }
    
  } catch (error) {
    return res.status(500).json({ status: "error", data: "Error de red: " + error.message });
  }
}
