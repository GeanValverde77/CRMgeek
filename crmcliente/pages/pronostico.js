import React, { useState } from 'react';
import Layout from '../components/Layout';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const OBTENER_MODELOS = gql`
  query obtenerModelos {
    obtenerModelos
  }
`;

const OBTENER_CLIENTES = gql`
  query obtenerClientesVendedor {
    obtenerClientesVendedor {
      id
      nombre
      apellido
    }
  }
`;

const GENERAR_PRONOSTICO = gql`
  mutation generarPronostico($mes: String!, $modelo: String!, $cliente: String) {
    generarPronostico(mes: $mes, modelo: $modelo, cliente: $cliente) {
      totalVentas
      promedio
      errorCuadratico
      pronostico {
        semana
        prediccion
        real
      }
    }
  }
`;

const Pronostico = () => {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [modelo, setModelo] = useState('');
  const [cliente, setCliente] = useState('');
  const [resultado, setResultado] = useState(null);

  const { data: modelosData } = useQuery(OBTENER_MODELOS);
  const { data: clientesData } = useQuery(OBTENER_CLIENTES);

  const [generarPronostico, { loading }] = useMutation(GENERAR_PRONOSTICO, {
    onCompleted: (data) => {
      setResultado(data.generarPronostico);
    },
    onError: (error) => {
      console.error("Error al generar pronóstico:", error);
      setResultado(null);
    }
  });

  const handleGenerarPronostico = () => {
    if (!mes || !modelo) return;
    generarPronostico({ variables: { mes, modelo, cliente: cliente || "" } });
  };

  const obtenerProximos6Meses = () => {
      const meses = [];
    const fechaActual = new Date();
    fechaActual.setDate(1); // aseguramos que no cause saltos raros por días
    for (let i = -12; i <= 6; i++) {
      const copia = new Date(fechaActual);
      copia.setMonth(copia.getMonth() + i);
      const year = copia.getFullYear();
      const month = String(copia.getMonth() + 1).padStart(2, '0');
      meses.push(`${year}-${month}`);
    }
    return meses;
  };

  const chartData = {
  labels: resultado?.pronostico?.map(p => p.semana) || [],
  datasets: [
    {
      label: 'Pronóstico de Ventas',
      data: resultado?.pronostico?.map(p => p.prediccion) || [],
      borderColor: 'blue',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      tension: 0.3,
      fill: false,
      pointRadius: 4,
    },
    {
      label: 'Banda Superior',
      data: resultado?.pronostico?.map(p => p.prediccion + resultado.desviacionHistorica) || [],
      borderColor: 'rgba(54, 162, 235, 0)',
      backgroundColor: 'rgba(54, 162, 235, 0.15)',
      fill: '-1',
    },
    {
      label: 'Banda Inferior',
      data: resultado?.pronostico?.map(p => p.prediccion - resultado.desviacionHistorica) || [],
      borderColor: 'rgba(54, 162, 235, 0)',
      backgroundColor: 'rgba(54, 162, 235, 0.15)',
      fill: false,
    },
    {
      label: 'Ventas Reales',
      data: resultado?.pronostico?.map(p => p.real) || [],
      borderColor: 'green',
      fill: false,
    },
  ]
};


  return (
    <Layout>
      <h1 className="text-2xl font-light">Pronóstico de Ventas</h1>

      <div className="mt-5">
        <label className="block text-lg font-medium">Seleccionar mes:</label>
        <select value={mes} onChange={e => setMes(e.target.value)} className="border p-2 rounded w-full">
          {obtenerProximos6Meses().map((m, idx) => (
            <option key={idx} value={m}>{m}</option>
          ))}
        </select>

        <label className="block text-lg font-medium mt-4">Seleccionar modelo:</label>
        <select value={modelo} onChange={e => setModelo(e.target.value)} className="border p-2 rounded w-full">
          <option value="">-- Selecciona un modelo --</option>
          {modelosData?.obtenerModelos?.map((nombre, index) => (
            <option key={index} value={nombre}>{nombre}</option>
          ))}
        </select>

        <label className="block text-lg font-medium mt-4">Seleccionar cliente (opcional):</label>
        <select value={cliente} onChange={e => setCliente(e.target.value)} className="border p-2 rounded w-full">
          <option value="">-- Todos los clientes --</option>
          {clientesData?.obtenerClientesVendedor?.map((c, index) => (
            <option key={index} value={c.id}>{c.nombre} {c.apellido}</option>
          ))}
        </select>

        <button
          onClick={handleGenerarPronostico}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
          disabled={loading || !modelo || !mes}
        >
          {loading ? 'Generando...' : 'Generar Pronóstico'}
        </button>
      </div>

      {loading && <p className="mt-4">Cargando...</p>}

      {resultado?.pronostico?.length > 0 && (
        <div className="mt-5">
          <h2 className="text-lg font-bold">Resultados:</h2>
          <p><strong>Total Ventas:</strong> {resultado.totalVentas.toFixed(2)} unidades</p>
          <p><strong>Promedio:</strong> {resultado.promedio.toFixed(2)} unidades</p>

          

          <h3 className="text-lg font-bold mt-4">Gráfico de Pronóstico:</h3>
          <div className="mt-3">
            <Line
  data={chartData}
  options={{
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} unidades`;
          }
        }
      },
      title: {
        display: true,
        text: 'Comparación entre Ventas Reales y Pronosticadas',
        font: {
          size: 16
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Semana'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Unidades'
        },
        beginAtZero: true,
        ticks: {
          stepSize: 0.2
        }
      }
    }
  }}
/>

          </div>
        </div>
      )}
    </Layout>
  );
};

export default Pronostico;
