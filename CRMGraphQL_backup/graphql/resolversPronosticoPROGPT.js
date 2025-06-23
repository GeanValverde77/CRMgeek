const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const interpretarConGPT = require("../gpt_analisis/interpretarResultadosGPT");

module.exports = {
  Mutation: {
    procesarPronosticoPROGPT: async (_, { data }) => {
      const tempCsvPath = path.join(__dirname, "../uploads/temp.csv");

      try {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No se proporcionaron datos válidos para el análisis.");
        }

        const columnas = Object.keys(data[0]);
        const csv = [
          columnas.join(","),
          ...data.map(row =>
            columnas.map(col => JSON.stringify(row[col] ?? "")).join(",")
          )
        ].join("\n");

        fs.writeFileSync(tempCsvPath, csv);
        console.log("✅ CSV temporal creado:", tempCsvPath);

        const scriptPath = path.join(__dirname, "../gpt_analisis/procesarCsvConModelos.py");
        const command = `python "${scriptPath}" "${tempCsvPath}"`;

        const salidaPython = await new Promise((resolve, reject) => {
          const child = spawn(command, { shell: true });

          let stdout = "";
          let stderr = "";

          child.stdout.on("data", data => {
            stdout += data.toString();
          });

          child.stderr.on("data", data => {
            stderr += data.toString();
          });

          child.on("close", code => {
            if (code !== 0) {
              console.error("❌ Código de salida:", code);
              console.error("❌ STDERR:", stderr);
              console.error("❌ STDOUT:", stdout);
              return reject("Error ejecutando script de predicción.");
            }

            try {
              const parsed = JSON.parse(stdout);
              if (parsed.error) {
                console.error("⚠️ Error desde Python:", parsed.error);
                if (parsed.traceback) console.error("🔍 Traceback:", parsed.traceback);
                return reject(parsed.error);
              }
              resolve(parsed);
            } catch (e) {
              console.error("❌ Error parseando JSON:", stdout);
              console.error("❌ Detalle:", e.message);
              return reject("Error parseando salida del script.");
            }
          });
        });

        const { modelos, historico, prediccion } = salidaPython;

        const modelosEvaluados = await interpretarConGPT(modelos);

        return {
          modelos: modelosEvaluados.map(m => {
            const original = modelos.find(o => o.modelo === m.modelo);
            return {
              ...m,
              predicciones: original?.predicciones || []
            };
          }),
          historico: historico.map(item => ({
            Semana: String(item.Semana),
            Total: item.Cantidad ?? item.Total ?? 0,
            SemanaIndex: item.SemanaIndex
          })),
          prediccion
        };

      } catch (error) {
        console.error("❌ Error en el procesamiento completo:", error);
        throw new Error("Error durante el análisis completo.");
      }
    }
  }
};
