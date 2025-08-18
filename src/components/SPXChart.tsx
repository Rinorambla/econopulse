'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Dati storici S&P 500 P/E ed EPS basati sul grafico fornito
const historicalData = [
  { year: 1993, eps: 28.5, pe: 21.3 },
  { year: 1994, eps: 31.2, pe: 15.0 },
  { year: 1995, eps: 33.8, pe: 18.1 },
  { year: 1996, eps: 38.1, pe: 20.7 },
  { year: 1997, eps: 40.6, pe: 24.4 },
  { year: 1998, eps: 42.4, pe: 32.6 },
  { year: 1999, eps: 45.9, pe: 30.5 },
  { year: 2000, eps: 49.2, pe: 27.6 },
  { year: 2001, eps: 24.7, pe: 46.5 },
  { year: 2002, eps: 27.6, pe: 31.4 },
  { year: 2003, eps: 38.4, pe: 22.8 },
  { year: 2004, eps: 58.6, pe: 20.7 },
  { year: 2005, eps: 69.2, pe: 17.8 },
  { year: 2006, eps: 81.5, pe: 17.4 },
  { year: 2007, eps: 66.2, pe: 22.8 },
  { year: 2008, eps: 14.9, pe: 60.7 },
  { year: 2009, eps: 49.5, pe: 20.5 },
  { year: 2010, eps: 81.4, pe: 15.2 },
  { year: 2011, eps: 96.5, pe: 13.4 },
  { year: 2012, eps: 100.1, pe: 14.4 },
  { year: 2013, eps: 107.2, pe: 17.0 },
  { year: 2014, eps: 118.8, pe: 17.6 },
  { year: 2015, eps: 100.5, pe: 20.2 },
  { year: 2016, eps: 105.9, pe: 21.2 },
  { year: 2017, eps: 124.5, pe: 21.7 },
  { year: 2018, eps: 162.9, pe: 16.8 },
  { year: 2019, eps: 162.8, pe: 19.7 },
  { year: 2020, eps: 139.0, pe: 26.3 },
  { year: 2021, eps: 208.1, pe: 22.8 },
  { year: 2022, eps: 219.2, pe: 18.1 },
  { year: 2023, eps: 223.5, pe: 20.8 },
  { year: 2024, eps: 235.0, pe: 24.2 },
  { year: 2025, eps: 245.0, pe: 25.8 } // Proiezione corrente
];

// Tooltip personalizzato
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium mb-2">{`Year: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.dataKey === 'eps' ? 'EPS' : 'P/E'}: {entry.value}
            {entry.dataKey === 'eps' ? '$' : 'x'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface SPXChartProps {
  className?: string;
}

const SPXChart: React.FC<SPXChartProps> = ({ className = "" }) => {
  return (
    <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">S&P 500 EPS and P/E Historical Chart</h3>
        <p className="text-sm text-gray-400">Historical earnings per share and price-to-earnings ratio trends</p>
      </div>
      
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={historicalData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: 'EPS ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: 'P/E Ratio', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="eps"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6, fill: '#3B82F6' }}
              name="EPS ($)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pe"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ fill: '#EF4444', r: 4 }}
              activeDot={{ r: 6, fill: '#EF4444' }}
              name="P/E Ratio"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
        <div>
          <h4 className="text-white font-medium mb-2">Key Observations:</h4>
          <ul className="space-y-1">
            <li>• EPS shows long-term growth trend</li>
            <li>• P/E ratio fluctuates with market cycles</li>
            <li>• Current P/E above historical average</li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-2">Notable Periods:</h4>
          <ul className="space-y-1">
            <li>• 2000: Dot-com bubble peak</li>
            <li>• 2008: Financial crisis impact</li>
            <li>• 2020: COVID-19 market disruption</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SPXChart;
