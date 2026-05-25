/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Info, RotateCcw, Calendar as CalendarIcon, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { INDICES, RealTimeIndexData } from './constants/stockData';
import { cn } from './lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <p className="text-slate-500 text-[11px] font-black mb-3 uppercase tracking-widest border-b border-slate-100 pb-2">
          {label && format(parseISO(label), 'MMM dd, yyyy')}
        </p>
        <div className="space-y-2">
          {payload.filter((entry: any) => entry.value !== null && entry.value !== undefined).sort((a: any, b: any) => b.value - a.value).map((entry: any, index: number) => {
            const perfValue = (entry.value as number) - 100;
            return (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-100" 
                    style={{ backgroundColor: entry.color }} 
                  />
                  <span className="text-slate-800 text-xs font-black tracking-tight">{entry.name}</span>
                </div>
                <span className={cn(
                  "text-xs font-mono font-black",
                  perfValue > 0 ? "text-rose-600" : perfValue < 0 ? "text-blue-600" : "text-slate-400"
                )}>
                  {perfValue > 0 ? '+' : ''}{perfValue.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// --- Small Card Component ---
interface SmallIndexCardProps {
  data: RealTimeIndexData;
  color: string;
  name: string;
  cumulativeReturn: number;
  baseDate: string;
}

const SmallIndexCard: React.FC<SmallIndexCardProps> = ({ data, name, cumulativeReturn, baseDate }) => {
  const isPositive = data.change >= 0;
  const isCumPositive = cumulativeReturn >= 0;

  const { periodMin, periodMax, positionPercent } = useMemo(() => {
    const history = data.history.filter(h => !isBefore(parseISO(h.date), parseISO(baseDate)));
    if (history.length === 0) return { periodMin: data.price, periodMax: data.price, positionPercent: 50 };
    
    const prices = history.map(h => h.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const percent = range === 0 ? 50 : ((data.price - min) / range) * 100;
    
    return { periodMin: min, periodMax: max, positionPercent: Math.min(100, Math.max(0, percent)) };
  }, [data.history, data.price, baseDate]);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ layout: { duration: 0.5, type: "spring", stiffness: 200, damping: 25 } }}
      className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-0.5 relative"
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-black text-slate-500 tracking-tight uppercase truncate mr-1">{name}</span>
        <div className={cn(
          "text-[12px] font-bold",
          isPositive ? "text-rose-600" : "text-blue-600"
        )}>
          {isPositive ? '▲' : '▼'}{Math.abs(data.change).toFixed(1)}%
        </div>
      </div>
      
      <div className="text-lg font-black text-slate-800 mt-1 tabular-nums">
        {data.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="text-[11px] font-black text-slate-400">수익률</div>
        <div className={cn(
          "text-[11px] font-black",
          isCumPositive ? "text-rose-600" : "text-blue-600"
        )}>
          {isCumPositive ? '+' : ''}{cumulativeReturn.toFixed(1)}%
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
          <span>L: {periodMin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>H: {periodMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full relative">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ left: `${positionPercent}%`, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 -ml-1 bg-slate-900 rounded-full z-10 shadow-sm border-2 border-white"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [marketData, setMarketData] = useState<RealTimeIndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate default base date (Last day of the previous year)
  const defaultBaseDateStr = useMemo(() => {
    const seoulTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    }).format(new Date());
    const currentYear = parseInt(seoulTime);
    return `${currentYear - 1}-12-31`;
  }, []);

  const [baseDate, setBaseDate] = useState(defaultBaseDateStr);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/market-data');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      console.error("Failed to fetch market data", error);
      setError(error instanceof Error ? error.message : "알 수 없는 오차");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  // Transform real-world data into Recharts relative performance format
  const chartData = useMemo(() => {
    if (marketData.length === 0) return [];
    
    const allDatesSet = new Set<string>();
    marketData.forEach(idx => idx.history.forEach(h => allDatesSet.add(h.date)));
    const allDates = Array.from(allDatesSet).sort();

    const filteredDates = allDates.filter(d => !isBefore(parseISO(d), parseISO(baseDate)));
    if (filteredDates.length === 0) return [];

    // Create a lookup map for faster processing: index_id -> date -> close
    const historyMap: Record<string, Record<string, number>> = {};
    marketData.forEach(index => {
      historyMap[index.symbol] = {};
      index.history.forEach(h => {
        historyMap[index.symbol][h.date] = h.close;
      });
    });

    // Find the actual starting price at or before the base date for each index
    const basePrices: Record<string, number> = {};
    marketData.forEach(index => {
      // Find the latest available date for this index that is <= baseDate
      // This is crucial for YTD/MTD returns to use the previous period's closing price
      const referenceHistory = index.history
        .filter(h => !isAfter(parseISO(h.date), parseISO(baseDate)))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
        
      if (referenceHistory) {
        basePrices[index.symbol] = referenceHistory.close;
      } else {
        // Fallback: if no data before, use the first available at or after
        const firstAfter = index.history
          .filter(h => !isBefore(parseISO(h.date), parseISO(baseDate)))
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        if (firstAfter) {
          basePrices[index.symbol] = firstAfter.close;
        }
      }
    });

    return filteredDates.map(date => {
      const row: any = { date };
      marketData.forEach(index => {
        const price = historyMap[index.symbol][date];
        const basePrice = basePrices[index.symbol];
        if (price !== undefined && basePrice) {
          row[index.symbol] = (price / basePrice) * 100;
        } else {
          row[index.symbol] = null; // Explicitly null for connectNulls
        }
      });
      return row;
    });
  }, [marketData, baseDate]);

  // Calculate sorted stats for the cards
  const sortedStats = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const statsList = INDICES.map(idx => {
      const data = marketData.find(d => d.symbol === idx.id);
      
      // Find the last valid performance value for this ticker to avoid weekend/holiday nulls yielding -100%
      let lastVal: number | null = null;
      for (let i = chartData.length - 1; i >= 0; i--) {
        const val = chartData[i][idx.id];
        if (val !== null && val !== undefined) {
          lastVal = val;
          break;
        }
      }
      const perf = lastVal !== null ? lastVal - 100 : 0;
      
      return {
        id: idx.id,
        name: idx.name,
        color: idx.color,
        performance: perf,
        data: data
      };
    });

    // Sort by performance descending
    return statsList.sort((a, b) => b.performance - a.performance);
  }, [marketData, chartData]);

  const handleReset = () => {
    setBaseDate(defaultBaseDateStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-rose-600" size={48} />
          <p className="text-slate-500 font-bold animate-pulse">실시간 시장 데이터를 가져오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">데이터 로드 실패</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button 
            onClick={fetchMarketData}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg text-rose-600 text-xs font-black uppercase tracking-wider mb-2">
              <TrendingUp size={14} />
              GLOBAL MARKET INTELLIGENCE
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">INDEX TERMINAL</h1>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-3 glass p-5 rounded-2xl">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">기준 날짜</label>
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={baseDate}
                  min="2024-01-01"
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setBaseDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all w-full"
                />
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 h-[46px]"
            >
              <RotateCcw size={16} />
              초기화
            </button>
          </div>
        </header>

        {/* Index Grid - Smaller Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedStats.map((stat, index) => {
              if (!stat.data) return null;
              return (
                <SmallIndexCard 
                  key={stat.id} 
                  data={stat.data} 
                  color={stat.color} 
                  name={stat.name}
                  cumulativeReturn={stat.performance}
                  baseDate={baseDate}
                />
              );
            })}
          </AnimatePresence>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-xl shadow-indigo-900/5">
          <div className="flex flex-col items-center mb-12 gap-3">
            <h2 className="text-2xl font-black text-slate-900">상대 지수 추이</h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                실시간 데이터
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                기준일 {baseDate}
              </div>
            </div>
          </div>

          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{ top: 20, right: 80, left: 0, bottom: 20 }}
                onClick={() => setHoveredIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 700 }}
                  dy={15}
                  ticks={Array.from(new Set(chartData.map(d => format(parseISO(d.date), 'yyyy-MM'))))
                    .map(month => chartData.find(d => format(parseISO(d.date), 'yyyy-MM') === month)?.date)
                    .filter((d): d is string => !!d)}
                  tickFormatter={(str) => {
                    const date = parseISO(str);
                    return format(date, 'MMM yy');
                  }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 700 }}
                  dx={-10}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke="#CBD5E1" strokeDasharray="4 4" label={{ position: 'right', value: '100', fill: '#94A3B8', fontSize: 11, fontWeight: 900, dx: 10 }} />
                
                {INDICES.map(idx => (
                  <Line 
                    key={idx.id}
                    type="monotone"
                    dataKey={idx.id}
                    name={idx.name}
                    stroke={idx.color}
                    strokeWidth={hoveredIndex === idx.id ? 5 : 2.5}
                    dot={false}
                    connectNulls={true}
                    opacity={hoveredIndex && hoveredIndex !== idx.id ? 0.1 : 0.9}
                    animationDuration={1500}
                    onMouseEnter={() => setHoveredIndex(idx.id)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    label={({ x, y, index }) => {
                      if (index === chartData.length - 1) {
                        return (
                          <text 
                            x={x + 10} 
                            y={y + 3} 
                            fill={idx.color} 
                            fontSize={11} 
                            fontWeight={800}
                            style={{ opacity: hoveredIndex && hoveredIndex !== idx.id ? 0.2 : 1 }}
                          >
                            {idx.name}
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                ))}
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="#F1F5F9" 
                  fill="#F8FAFC"
                  travellerWidth={10}
                  onChange={(obj: any) => {
                    if (obj && obj.startIndex !== undefined && chartData[obj.startIndex]) {
                      const newBase = chartData[obj.startIndex].date;
                      if (newBase !== baseDate) {
                        setBaseDate(newBase);
                      }
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="text-center py-12 text-sm text-slate-400 font-bold uppercase tracking-[0.2em] border-t border-slate-100">
          Source: Real-time via Yahoo Finance API Proxy • Updated {marketData.length > 0 ? format(new Date(), 'HH:mm:ss') : ''}
        </footer>
      </div>
    </div>
  );
}
