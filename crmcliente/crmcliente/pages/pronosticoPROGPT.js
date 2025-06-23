import React, { useState } from 'react';
import Layout from '../components/Layout';
import { gql, useMutation } from '@apollo/client';
import Papa from 'papaparse';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const PROCESAR_PRONOSTICO = gql`
  mutation procesarPronosticoPROGPT($data: JSON!) {
    procesarPronosticoPROGPT(data: $data) {
      modelos {
        modelo
        MAE
        MAPE
        R2
        precision
        recomendacion
        predicciones {
          semana
          valor
        }
      }
      historico {
        Semana
        Total
        SemanaIndex
      }
      prediccion {
        semana
        prediccion
      }
    }
  }
`;

const PronosticoPROGPT = () => {
  const [csvData, setCsvData] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);

  const [procesarPronostico] = useMutation(PROCESAR_PRONOSTICO, {
    onCompleted: (data) => {
      setResultados(data.procesarPronosticoPROGPT);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const agruparPorModelo = (productos) => {
  return productos.map((item) => {
    const nombre = item.Producto?.toUpperCase() || "";
    let modelo = null;

    if (nombre.includes("IPHONE X")) modelo = "IPHONE X";
    else if (nombre.includes("IPHONE 11")) modelo = "IPHONE 11";
    else if (nombre.includes("IPHONE 12")) modelo = "IPHONE 12";
    else if (nombre.includes("IPHONE 13")) modelo = "IPHONE 13";
    else if (nombre.includes("IPHONE 14")) modelo = "IPHONE 14";
    else if (nombre.includes("IPHONE 15")) modelo = "IPHONE 15";
    else if (nombre.includes("IPHONE 16")) modelo = "IPHONE 16";

      if (!modelo) return null; // Excluye productos que no sean iPhones
      return { ...item, Modelo: modelo };
    }).filter(Boolean); // Elimina los null
  };


  const handleCSVUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const clean = results.data.filter(
          r => r && typeof r === 'object' && Object.values(r).some(v => v !== null && v !== "")
        );
        const agrupado = agruparPorModelo(clean);
        setCsvData(agrupado);
        setColumnas(Object.keys(agrupado[0] || {}));
        setFiltros({});
        setResultados(null);
        setError(null);
      },
      error: (err) => {
        setError("Error leyendo el CSV: " + err.message);
      }
    });
  };

  const handleFiltro = (col, val) => {
    setFiltros(prev => ({ ...prev, [col]: val }));
  };

  const obtenerOpcionesUnicas = (col) => {
    return [...new Set(csvData.map(row => row[col]).filter(v => v != null && v !== ""))];
  };

  const datosFiltrados = csvData.filter(row =>
    Object.entries(filtros).every(([col, val]) => !val || row[col]?.toString() === val)
  );

  const handleAnalizar = () => {
    if (datosFiltrados.length === 0) {
      setError("No hay datos filtrados para analizar.");
      return;
    }
    procesarPronostico({ variables: { data: datosFiltrados } });
  };

  const renderGrafico = () => {
    if (!resultados?.historico || !resultados?.prediccion) return null;

    const labels = [
      ...resultados.historico.map((item) => item.Semana),
      ...resultados.prediccion.map((item) => item.semana)
    ];

    const datosHistoricos = resultados.historico.map((item) => item.Total);
    const datosPrediccion = resultados.prediccion.map((item) => item.prediccion);

    const data = {
      labels,
      datasets: [
        {
          label: 'Histórico',
          data: [...datosHistoricos, null, null, null],
          borderColor: 'blue',
          tension: 0.3,
        },
        {
          label: 'Predicción promedio',
          data: [...new Array(datosHistoricos.length).fill(null), ...datosPrediccion],
          borderColor: 'green',
          borderDash: [5, 5],
          tension: 0.3,
        }
      ]
    };

    return <Line data={data} className="my-6" />;
  };

  return (
    <Layout>
      <h1 className="text-2xl font-light mb-6">Pronóstico PRO + GPT</h1>

      <div className="bg-white p-6 shadow rounded max-w-3xl mx-auto">
        <label className="block mb-2 font-medium">Subir archivo CSV:</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="border p-2 w-full rounded mb-4"
        />
      </div>

      {csvData.length > 0 && (
        <div className="bg-white mt-8 p-6 shadow rounded max-w-6xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Filtros disponibles</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {columnas.map((col, i) => (
              <div key={i}>
                <label className="block text-sm font-semibold mb-1">{col}</label>
                <select
                  className="border p-2 w-full rounded"
                  value={filtros[col] || ""}
                  onChange={(e) => handleFiltro(col, e.target.value)}
                >
                  <option value="">Todos</option>
                  {obtenerOpcionesUnicas(col).map((val, idx) => (
                    <option key={idx} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleAnalizar}
            className="bg-green-600 text-white px-6 py-2 rounded font-semibold"
          >
            Analizar filtrados con GPT
          </button>

          {/* Tabla evaluación de modelos */}
          {resultados?.modelos?.length > 0 && (
            <>
              <div className="overflow-x-auto mt-6">
                <h3 className="font-semibold mb-2">📊 Evaluación de Modelos</h3>
                <table className="min-w-full bg-white border border-gray-300 rounded shadow text-sm">
                  <thead className="bg-gray-100 font-semibold">
                    <tr>
                      <th className="border px-4 py-2 text-left">Modelo</th>
                      <th className="border px-4 py-2 text-left">MAE</th>
                      <th className="border px-4 py-2 text-left">MAPE (%)</th>
                      <th className="border px-4 py-2 text-left">R²</th>
                      <th className="border px-4 py-2 text-left">Precisión</th>
                      <th className="border px-4 py-2 text-left">Recomendación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.modelos.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border px-4 py-2">{row.modelo}</td>
                        <td className="border px-4 py-2">{row.MAE}</td>
                        <td className="border px-4 py-2">{row.MAPE}</td>
                        <td className="border px-4 py-2">{row.R2}</td>
                        <td className="border px-4 py-2">{row.precision || "—"}</td>
                        <td className="border px-4 py-2">{row.recomendacion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Predicciones por modelo */}
              {/* Predicciones por modelo */}
              <div className="overflow-x-auto mt-6">
                <h3 className="font-semibold mb-2">🔮 Predicción de cada Modelo</h3>
                {resultados.modelos.map((modelo, idx) => (
                  <div key={idx} className="mb-4">
                    <h4 className="font-semibold text-sm mb-1">{modelo.modelo}</h4>
                    <table className="min-w-full bg-white border border-gray-200 rounded text-sm mb-2">
                      <thead className="bg-gray-100 font-semibold">
                        <tr>
                          <th className="border px-3 py-1 text-left">Semana</th>
                          <th className="border px-3 py-1 text-left">Predicción (Unidades)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelo.predicciones?.map((p, j) => (
                          <tr key={j}>
                            <td className="border px-3 py-1">{p.semana}</td>
                            <td className="border px-3 py-1">{p.valor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

            </>
          )}

          {renderGrafico()}

          {/* Tabla de promedio semanal */}
          {resultados?.prediccion?.length > 0 && (
            <div className="overflow-x-auto mt-6">
              <h3 className="font-semibold mb-2">📅 Predicción Promedio por Semana</h3>
              <table className="min-w-full bg-white border border-gray-300 rounded shadow text-sm">
                <thead className="bg-gray-100 font-semibold">
                  <tr>
                    <th className="border px-4 py-2 text-left">Semana</th>
                    <th className="border px-4 py-2 text-left">Promedio de Predicción</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.prediccion.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-4 py-2">{row.semana}</td>
                      <td className="border px-4 py-2">{row.prediccion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <p className="text-red-600 font-semibold mt-4">{error}</p>
          )}
        </div>
      )}
    </Layout>
  );
};

export default PronosticoPROGPT;
