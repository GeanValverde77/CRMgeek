const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Evalúa resultados de modelos ML y devuelve recomendaciones interpretadas por GPT
 * @param {Array<Object>} modelResults - Lista de modelos con MAE, MAPE y R²
 * @returns {Promise<Array>} - Modelos con campos: precision y recomendacion
 */
async function interpretarConGPT(modelResults) {
  if (!Array.isArray(modelResults) || modelResults.length === 0) {
    throw new Error("No se proporcionaron resultados de modelos válidos.");
  }

  const prompt = `
Tienes los siguientes resultados de modelos de predicción de ventas:

${JSON.stringify(modelResults, null, 2)}

Evalúa cada modelo considerando sus métricas (MAE, MAPE y R²).
Clasifica la precisión como "Alta", "Media" o "Baja", y proporciona una breve recomendación.

Devuelve solo un JSON con esta estructura:
[
  {
    "modelo": "Nombre del modelo",
    "precision": "Alta | Media | Baja",
    "recomendacion": "Texto breve"
  }
]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: "Eres un experto en modelos de machine learning. Devuelve solo JSON válido, sin texto adicional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let respuesta = completion.choices?.[0]?.message?.content?.trim() || "";

    // 🧼 Limpiar posibles bloques de código que puedan romper JSON.parse
    respuesta = respuesta.replace(/```json|```/g, "").trim();

    let interpretacion;
    try {
      interpretacion = JSON.parse(respuesta);
    } catch (err) {
      console.error("❌ No se pudo interpretar el JSON de GPT:", respuesta);
      throw new Error("La respuesta de GPT no es un JSON válido.");
    }

    // 🧠 Combinar con datos originales
    return modelResults.map((modelo) => {
      const gpt = interpretacion.find(
        (i) => i.modelo?.toLowerCase() === modelo.modelo?.toLowerCase()
      );
      return {
        ...modelo,
        precision: gpt?.precision || "No evaluado",
        recomendacion: gpt?.recomendacion || "Sin recomendación",
      };
    });
  } catch (error) {
    console.error("❌ Error al comunicarse con OpenAI:", error.message);
    throw new Error("Error al obtener interpretación de GPT.");
  }
}

module.exports = interpretarConGPT;
