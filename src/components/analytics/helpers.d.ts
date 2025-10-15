export interface HistoryBar { time:number; close:number }
export interface HistoryResponse { symbol:string; bars:HistoryBar[] }
export function fetchHistory(symbol:string, range:string, interval:string): Promise<HistoryResponse | null>
