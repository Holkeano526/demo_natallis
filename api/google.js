export default async function handler(req, res) {

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyI6gcaiR4mEKGP594j3meC4QFiaQcgvT-3Bq5djbA0k69P3FgwoWSvff5plzQv8icM/exec";
  

  const SECRET_PASSWORD = process.env.APP_PASSWORD;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Extraemos la contraseña que nos envía la página web
  const { password, ...bodyData } = req.body;

  // EL GUARDIÁN: Comparamos las contraseñas
  if (!SECRET_PASSWORD || password !== SECRET_PASSWORD) {
    return res.status(401).json({ status: "error", data: "Contraseña incorrecta o no configurada." });
  }

  try {
    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(bodyData) // Enviamos a Google los datos SIN la contraseña
    });

    const data = await googleResponse.json();
    res.status(200).json(data);
    
  } catch (error) {
    res.status(500).json({ status: "error", data: error.message });
  }
}
