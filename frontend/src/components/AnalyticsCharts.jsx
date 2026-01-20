import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
);

const AnalyticsCharts = ({ data }) => {
  if (!data) return <p>Loading Analytics...</p>;

  // 1. Configuration for Delay Bar Chart
  const barData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), // 0:00 to 23:00
    datasets: [
      {
        label: 'Avg Delay (Minutes)',
        data: data.delays,
        backgroundColor: 'rgba(231, 76, 60, 0.7)', // Red
      },
    ],
  };

  // 2. Configuration for Passenger Line Chart
  const lineData = {
    labels: data.labels, // Mon, Tue, Wed...
    datasets: [
      {
        label: 'Total Passengers',
        data: data.passengers,
        borderColor: 'rgb(52, 152, 219)', // Blue
        backgroundColor: 'rgba(52, 152, 219, 0.5)',
        tension: 0.4, // Curvy line
      },
    ],
  };

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
      
      {/* Chart 1: Delays */}
      <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#555' }}>🕒 Peak Hour Delays</h3>
        <Bar data={barData} />
      </div>

      {/* Chart 2: Demand */}
      <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#555' }}>📈 Weekly Passenger Demand</h3>
        <Line data={lineData} />
      </div>

    </div>
  );
};

export default AnalyticsCharts;