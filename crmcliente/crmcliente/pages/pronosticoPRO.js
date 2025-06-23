// pages/pronosticoPRO.js

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useMutation, gql } from "@apollo/client";

const PROCESAR_PRONOSTICO_PRO = gql`
  mutation ProcesarPronosticoPRO(
    $data: JSON
    $target: String!
    $features: [String!]!
    $modelo: String!
    $cliente: String
    $producto: String
  ) {
    procesarPronosticoPRO(
      data: $data
      target: $target
      features: $features
      modelo: $modelo
      cliente: $cliente
      producto: $producto
    ) {
      predicciones
      error_porcentaje
    }
  }
`;

const PronosticoPRO = () => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [numericHeaders, setNumericHeaders] = useState([]);
  const [featureCols, setFeatureCols] = useState([]);
  const [modelo, setModelo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [errorModelo, setErrorModelo] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [productosUnicos, setProductosUnicos] = useState([]);
  const [clientesUnicos, setClientesUnicos] = useState([]);
  const [errorGeneral, setErrorGeneral] = useState('');

  const [procesarPronosticoPRO] = useMutation(PROCESAR_PRONOSTICO_PRO);

  const handleCSVUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) {
      setErrorGeneral("No se seleccionó ningún archivo CSV.");
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function (results) {
        let rows = results.data;

        if (!Array.isArray(rows) || rows.length === 0) {
          setErrorGeneral("El archivo CSV está vacío o no tiene filas válidas.");
          return;
        }

        const cleanData = rows.filter(
          row => row && typeof row === 'object' && Object.values(row).some(v => v !== null && v !== "")
        );

        if (cleanData.length === 0 || !cleanData[0] || Object.keys(cleanData[0]).length === 0) {
          setErrorGeneral("Los datos del CSV no tienen formato válido o están vacíos.");
          return;
        }

        // Agrupar modelos iPhone
        const normalizarProducto = (nombre) => {
          if (typeof nombre !== 'string') return nombre;
          const match = nombre.toUpperCase().match(/IPHONE\s?(\d+|X|XR|XS|SE)/);
          return match ? `IPHONE ${match[1]}` : null;
        };

        const filtrados = cleanData.filter(row => normalizarProducto(row['Producto']) !== null);

        const procesados = filtrados.map(row => ({
          ...row,
          Producto: normalizarProducto(row['Producto'])
        }));

        setCsvData(procesados);

        const allHeaders = Object.keys(procesados[0]);
        setHeaders(allHeaders);

        const numericCols = allHeaders.filter(h => typeof procesados[0][h] === 'number');
        setNumericHeaders(numericCols);

        const productos = [...new Set(procesados.map(r => r['Producto']).filter(Boolean))];
        const clientes = [...new Set(procesados.map(r => r['Nombre del cliente']).filter(Boolean))];
        setProductosUnicos(productos);
        setClientesUnicos(clientes);
        setErrorGeneral("");
      }
    });
  };

  const handleEnviar = async () => {
    const target = "Cantidad";
    setErrorGeneral('');

    if (!modelo || featureCols.length === 0) {
      setErrorGeneral("Debes seleccionar el modelo y al menos una columna predictora.");
      return;
    }

    if (csvData.length < 10) {
      setErrorGeneral("No hay suficientes datos válidos para generar el pronóstico.");
      return;
    }

    try {
      const { data } = await procesarPronosticoPRO({
        variables: {
          data: csvData,
          target,
          features: featureCols,
          modelo,
          cliente: clienteSeleccionado || null,
          producto: productoSeleccionado || null
        }
      });

      if (data?.procesarPronosticoPRO) {
        setResultado(data.procesarPronosticoPRO.predicciones);
        setErrorModelo(data.procesarPronosticoPRO.error_porcentaje);
      } else {
        setErrorGeneral("No se recibió una respuesta válida del servidor.");
      }
    } catch (error) {
      console.error("❌ Error al ejecutar la mutación:", error);
      setErrorGeneral("Hubo un error generando el pronóstico. Asegúrate de que los datos cargados sean suficientes y válidos.");
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-6">PronósticoPRO</h1>

      <input type="file" accept=".csv" onChange={handleCSVUpload} className="mb-4 w-full" />

      {headers.length > 0 && (
        <>
          <p className="mb-2 font-medium">Columna a predecir: <span className="text-blue-700 font-semibold">Cantidad</span></p>

          <div className="mb-4">
            <label className="font-medium">Columnas predictoras (numéricas):</label>
            {numericHeaders.map(h => (
              <div key={h} className="ml-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value={h}
                    checked={featureCols.includes(h)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFeatureCols([...featureCols, h]);
                      } else {
                        setFeatureCols(featureCols.filter(col => col !== h));
                      }
                    }}
                    className="mr-2"
                  />
                  {h}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block font-medium mb-1">Modelo:</label>
            <select value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full border p-2 rounded">
              <option value="">-- Selecciona --</option>
              <option value="gbr">Gradient Boosting</option>
              <option value="rf">Random Forest</option>
              <option value="lr">Regresión Lineal</option>
              <option value="xgb">XGBoost</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block font-medium mb-1">Producto (opcional):</label>
            <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} className="w-full border p-2 rounded">
              <option value="">-- Todos --</option>
              {productosUnicos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <label className="block font-medium mb-1">Cliente (opcional):</label>
            <select value={clienteSeleccionado} onChange={(e) => setClienteSeleccionado(e.target.value)} className="w-full border p-2 rounded">
              <option value="">-- Todos --</option>
              {clientesUnicos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button onClick={handleEnviar} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded">
            Generar Pronóstico
          </button>

          {errorGeneral && (
            <div className="mt-4 text-red-600 font-medium">
              ⚠️ {errorGeneral}
            </div>
          )}
        </>
      )}

      {resultado && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Resultado de Predicción</h2>
          <p className="mb-4">Error del modelo: <strong>{errorModelo}%</strong></p>

          <Line
            data={{
              labels: resultado.map((_, i) => `Mes ${i + 1}`),
              datasets: [{
                label: 'Predicción',
                data: resultado,
                tension: 0.4,
              }]
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PronosticoPRO;