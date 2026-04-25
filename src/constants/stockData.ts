export interface IndexData {
  id: string;
  name: string;
  color: string;
}

export interface HistoricalPrice {
  date: string;
  [key: string]: number | string; // indexId: price
}

export const INDICES = [
  { id: '^KS11', name: 'KOSPI', color: '#B069EF' },
  { id: '^KS200', name: 'KOSPI 200', color: '#D63031' },
  { id: '^KQ11', name: 'KOSDAQ', color: '#E84393' },
  { id: '^IXIC', name: 'NASDAQ', color: '#EB4D4B' },
  { id: '^GSPC', name: 'S&P 500', color: '#22A6B3' },
  { id: '^N225', name: 'NIKKEI 225', color: '#31B6A1' },
  { id: '^DJI', name: 'DOW JONES', color: '#FF7979' },
  { id: '^BSESN', name: 'SENSEX', color: '#F0932B' },
  { id: '^NSEI', name: 'NIFTY 50', color: '#68E0CF' },
  { id: 'GC=F', name: 'GOLD', color: '#FBC531' },
  { id: 'SI=F', name: 'SILVER', color: '#487EB0' },
  { id: '^RUT', name: 'RUSSELL 2000', color: '#F9CA24' },
  { id: 'HG=F', name: 'COPPER', color: '#1A6BCC' },
  { id: '000300.SS', name: 'CSI 300', color: '#4834D4' },
];

export interface RealTimeIndexData {
  symbol: string;
  price: number;
  change: number;
  high: number;
  low: number;
  history: { date: string; close: number }[];
}
