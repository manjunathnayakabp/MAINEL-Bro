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

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
);

const AnalyticsCharts = ({ data }) => {
  if (!data) return <p className="text-muted">Loading analytics...</p>;

  const barData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Avg Delay (Minutes)',
        data: data.delays,
        backgroundColor: 'rgba(220, 38, 38, 0.7)'
      }
    ]
  };

  const lineData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Total Passengers',
        data: data.passengers,
        borderColor: 'rgb(15, 76, 129)',
        backgroundColor: 'rgba(15, 76, 129, 0.2)',
        tension: 0.4
      }
    ]
  };

  return (
    <div className="chart-grid">
      <div className="chart-card">
        <h3>Peak Hour Delays</h3>
        <Bar data={barData} />
      </div>

      <div className="chart-card">
        <h3>Weekly Passenger Demand</h3>
        <Line data={lineData} />
      </div>
    </div>
  );
};

export default AnalyticsCharts;
