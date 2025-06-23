// echoGPT.js
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

// Cargar la clave desde .env
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Función de prueba
async function probarEcho(mensajeUsuario = "Hola GPT, ¿puedes repetirme esto?") {
  try {
    const respuesta = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: mensajeUsuario }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    console.log("✅ Respuesta de OpenAI:\n", respuesta.data.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error al llamar a OpenAI:", error.response?.data || error.message);
  }
}

// Ejecutar si se corre directamente
if (require.main === module) {
  probarEcho();
}
