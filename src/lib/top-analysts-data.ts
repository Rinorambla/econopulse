// Curated leaderboard of top Wall Street analysts.
// Seed dataset used by /api/top-analysts. Stats are representative and used to
// power the ranked leaderboard UI. The "Last Rating" feed can be enriched with
// live analyst activity from Finnhub when FINNHUB_API_KEY is configured.

export type AnalystSector =
  | 'Technology'
  | 'Healthcare'
  | 'Financials'
  | 'Industrials'
  | 'Energy'
  | 'Consumer'
  | 'Communication'
  | 'Materials'
  | 'Real Estate'
  | 'Utilities'

export type Analyst = {
  id: string
  name: string
  rating: number // 0-5 star score
  company: string
  sector: AnalystSector
  successRate: number // %
  avgReturn: number // %
  ratings: number // total ratings issued
  lastRating: string // ISO date
  coverage: Coverage[] // stocks this analyst actively covers (buy/sell calls)
}

export type RatingAction = 'Buy' | 'Hold' | 'Sell'

export type Coverage = {
  ticker: string
  company: string
  action: RatingAction
  expectedReturn: number // % implied upside/downside vs current price
  priceTarget: number // analyst price target
  date: string // ISO date of the call
}

// Base curated roster (unranked). Rank is computed at request time.
const ROSTER: Omit<Analyst, 'id' | 'coverage'>[] = [
  { name: 'Mark Mahaney', rating: 4.99, company: 'Evercore ISI', sector: 'Technology', successRate: 78.2, avgReturn: 31.4, ratings: 1620, lastRating: '2026-05-30' },
  { name: 'Brian White', rating: 4.98, company: 'Monness Crespi Hardt', sector: 'Technology', successRate: 76.5, avgReturn: 42.1, ratings: 920, lastRating: '2026-05-29' },
  { name: 'Wamsi Mohan', rating: 4.98, company: 'Bank of America', sector: 'Technology', successRate: 74.9, avgReturn: 28.7, ratings: 1140, lastRating: '2026-05-28' },
  { name: 'Joseph Moore', rating: 4.97, company: 'Morgan Stanley', sector: 'Technology', successRate: 72.3, avgReturn: 38.9, ratings: 1380, lastRating: '2026-05-30' },
  { name: 'Vivek Arya', rating: 4.97, company: 'Bank of America', sector: 'Technology', successRate: 71.8, avgReturn: 45.6, ratings: 1290, lastRating: '2026-05-29' },
  { name: 'Toshiya Hari', rating: 4.97, company: 'Goldman Sachs', sector: 'Technology', successRate: 70.4, avgReturn: 36.2, ratings: 880, lastRating: '2026-05-27' },
  { name: 'Harlan Sur', rating: 4.96, company: 'JPMorgan', sector: 'Technology', successRate: 68.9, avgReturn: 33.5, ratings: 1010, lastRating: '2026-05-26' },
  { name: 'Chris Dendrinos', rating: 4.96, company: 'RBC Capital', sector: 'Technology', successRate: 63.7, avgReturn: 65.0, ratings: 344, lastRating: '2026-05-28' },
  { name: 'Faisal Khurshid', rating: 4.96, company: 'Jefferies', sector: 'Healthcare', successRate: 64.3, avgReturn: 68.5, ratings: 232, lastRating: '2026-05-27' },
  { name: 'Peter Arment', rating: 4.96, company: 'Robert W. Baird', sector: 'Industrials', successRate: 69.4, avgReturn: 19.3, ratings: 748, lastRating: '2026-05-29' },
  { name: 'Nathan Jones', rating: 4.96, company: 'Stifel Nicolaus', sector: 'Industrials', successRate: 70.0, avgReturn: 19.5, ratings: 1336, lastRating: '2026-05-22' },
  { name: 'Patrick Brown', rating: 4.96, company: 'Raymond James', sector: 'Industrials', successRate: 70.5, avgReturn: 19.5, ratings: 906, lastRating: '2026-05-01' },
  { name: 'Selman Akyol', rating: 4.96, company: 'Stifel Nicolaus', sector: 'Energy', successRate: 73.7, avgReturn: 15.5, ratings: 706, lastRating: '2026-05-14' },
  { name: 'Bose George', rating: 4.96, company: 'KBW', sector: 'Financials', successRate: 74.7, avgReturn: 13.4, ratings: 1091, lastRating: '2026-05-19' },
  { name: 'Tycho Peterson', rating: 4.95, company: 'Jefferies', sector: 'Healthcare', successRate: 67.1, avgReturn: 29.8, ratings: 980, lastRating: '2026-05-25' },
  { name: 'Brian Abrahams', rating: 4.95, company: 'RBC Capital', sector: 'Healthcare', successRate: 66.4, avgReturn: 41.2, ratings: 620, lastRating: '2026-05-24' },
  { name: 'Geoff Meacham', rating: 4.95, company: 'Bank of America', sector: 'Healthcare', successRate: 65.9, avgReturn: 33.7, ratings: 870, lastRating: '2026-05-26' },
  { name: 'Terence Flynn', rating: 4.95, company: 'Morgan Stanley', sector: 'Healthcare', successRate: 68.2, avgReturn: 24.6, ratings: 740, lastRating: '2026-05-23' },
  { name: 'Christopher Schott', rating: 4.94, company: 'JPMorgan', sector: 'Healthcare', successRate: 69.7, avgReturn: 21.3, ratings: 1180, lastRating: '2026-05-28' },
  { name: 'John Murphy', rating: 4.94, company: 'Bank of America', sector: 'Consumer', successRate: 71.2, avgReturn: 22.8, ratings: 1240, lastRating: '2026-05-27' },
  { name: 'Adam Jonas', rating: 4.94, company: 'Morgan Stanley', sector: 'Consumer', successRate: 64.5, avgReturn: 39.4, ratings: 1320, lastRating: '2026-05-30' },
  { name: 'Itay Michaeli', rating: 4.93, company: 'Citigroup', sector: 'Consumer', successRate: 70.8, avgReturn: 20.1, ratings: 690, lastRating: '2026-05-21' },
  { name: 'Rod Lache', rating: 4.93, company: 'Wolfe Research', sector: 'Consumer', successRate: 72.6, avgReturn: 18.9, ratings: 540, lastRating: '2026-05-20' },
  { name: 'Brian Nowak', rating: 4.93, company: 'Morgan Stanley', sector: 'Communication', successRate: 73.4, avgReturn: 27.5, ratings: 1010, lastRating: '2026-05-29' },
  { name: 'Doug Anmuth', rating: 4.92, company: 'JPMorgan', sector: 'Communication', successRate: 71.9, avgReturn: 30.2, ratings: 1150, lastRating: '2026-05-28' },
  { name: 'Justin Post', rating: 4.92, company: 'Bank of America', sector: 'Communication', successRate: 70.6, avgReturn: 28.8, ratings: 980, lastRating: '2026-05-26' },
  { name: 'Eric Sheridan', rating: 4.92, company: 'Goldman Sachs', sector: 'Communication', successRate: 69.3, avgReturn: 26.4, ratings: 860, lastRating: '2026-05-25' },
  { name: 'Stephen Byrd', rating: 4.91, company: 'Morgan Stanley', sector: 'Utilities', successRate: 74.1, avgReturn: 16.7, ratings: 720, lastRating: '2026-05-22' },
  { name: 'Shar Pourreza', rating: 4.91, company: 'Guggenheim', sector: 'Utilities', successRate: 75.3, avgReturn: 15.9, ratings: 810, lastRating: '2026-05-24' },
  { name: 'Durgesh Chopra', rating: 4.91, company: 'Evercore ISI', sector: 'Utilities', successRate: 73.8, avgReturn: 14.6, ratings: 470, lastRating: '2026-05-19' },
  { name: 'Neil Mehta', rating: 4.90, company: 'Goldman Sachs', sector: 'Energy', successRate: 72.4, avgReturn: 23.1, ratings: 930, lastRating: '2026-05-27' },
  { name: 'Devin McDermott', rating: 4.90, company: 'Morgan Stanley', sector: 'Energy', successRate: 71.0, avgReturn: 21.7, ratings: 680, lastRating: '2026-05-26' },
  { name: 'Roger Read', rating: 4.90, company: 'Wells Fargo', sector: 'Energy', successRate: 70.2, avgReturn: 18.4, ratings: 750, lastRating: '2026-05-23' },
  { name: 'Doug Leggate', rating: 4.89, company: 'Wolfe Research', sector: 'Energy', successRate: 73.1, avgReturn: 17.2, ratings: 820, lastRating: '2026-05-21' },
  { name: 'Betty Chen', rating: 4.89, company: 'Wedbush', sector: 'Consumer', successRate: 68.7, avgReturn: 25.3, ratings: 560, lastRating: '2026-05-20' },
  { name: 'Simeon Gutman', rating: 4.89, company: 'Morgan Stanley', sector: 'Consumer', successRate: 71.5, avgReturn: 19.8, ratings: 980, lastRating: '2026-05-28' },
  { name: 'Michael Lasser', rating: 4.88, company: 'UBS', sector: 'Consumer', successRate: 72.9, avgReturn: 18.1, ratings: 1040, lastRating: '2026-05-27' },
  { name: 'Steven Wieczynski', rating: 4.88, company: 'Stifel Nicolaus', sector: 'Consumer', successRate: 70.3, avgReturn: 22.4, ratings: 690, lastRating: '2026-05-25' },
  { name: 'Ebrahim Poonawala', rating: 4.88, company: 'Bank of America', sector: 'Financials', successRate: 73.6, avgReturn: 14.9, ratings: 1130, lastRating: '2026-05-26' },
  { name: 'Betsy Graseck', rating: 4.87, company: 'Morgan Stanley', sector: 'Financials', successRate: 74.4, avgReturn: 13.8, ratings: 1290, lastRating: '2026-05-29' },
  { name: 'Mike Mayo', rating: 4.87, company: 'Wells Fargo', sector: 'Financials', successRate: 69.8, avgReturn: 16.2, ratings: 980, lastRating: '2026-05-24' },
  { name: 'Glenn Schorr', rating: 4.87, company: 'Evercore ISI', sector: 'Financials', successRate: 72.1, avgReturn: 15.4, ratings: 870, lastRating: '2026-05-22' },
  { name: 'Ryan Nash', rating: 4.86, company: 'Goldman Sachs', sector: 'Financials', successRate: 71.3, avgReturn: 14.1, ratings: 760, lastRating: '2026-05-21' },
  { name: 'Seth Seifman', rating: 4.86, company: 'JPMorgan', sector: 'Industrials', successRate: 70.7, avgReturn: 20.6, ratings: 840, lastRating: '2026-05-23' },
  { name: 'Sheila Kahyaoglu', rating: 4.86, company: 'Jefferies', sector: 'Industrials', successRate: 69.5, avgReturn: 21.9, ratings: 720, lastRating: '2026-05-25' },
  { name: 'Jamie Cook', rating: 4.85, company: 'Truist Securities', sector: 'Industrials', successRate: 71.8, avgReturn: 18.7, ratings: 910, lastRating: '2026-05-26' },
  { name: 'Stephen Tusa', rating: 4.85, company: 'JPMorgan', sector: 'Industrials', successRate: 68.4, avgReturn: 17.5, ratings: 1020, lastRating: '2026-05-20' },
  { name: 'Chris Kapsch', rating: 4.85, company: 'Loop Capital', sector: 'Materials', successRate: 70.9, avgReturn: 23.6, ratings: 480, lastRating: '2026-05-18' },
  { name: 'John Roberts', rating: 4.84, company: 'Mizuho', sector: 'Materials', successRate: 72.5, avgReturn: 16.8, ratings: 640, lastRating: '2026-05-19' },
  { name: 'David Begleiter', rating: 4.84, company: 'Deutsche Bank', sector: 'Materials', successRate: 71.1, avgReturn: 15.2, ratings: 880, lastRating: '2026-05-22' },
  { name: 'Josh Sullivan', rating: 4.84, company: 'Benchmark', sector: 'Industrials', successRate: 67.9, avgReturn: 27.1, ratings: 410, lastRating: '2026-05-24' },
  { name: 'Ken Herbert', rating: 4.83, company: 'RBC Capital', sector: 'Industrials', successRate: 70.1, avgReturn: 19.4, ratings: 760, lastRating: '2026-05-25' },
  { name: 'Anthony Paolone', rating: 4.83, company: 'JPMorgan', sector: 'Real Estate', successRate: 73.2, avgReturn: 12.9, ratings: 690, lastRating: '2026-05-21' },
  { name: 'Steve Sakwa', rating: 4.83, company: 'Evercore ISI', sector: 'Real Estate', successRate: 74.6, avgReturn: 13.1, ratings: 1150, lastRating: '2026-05-23' },
  { name: 'Michael Goldsmith', rating: 4.82, company: 'UBS', sector: 'Real Estate', successRate: 72.7, avgReturn: 12.4, ratings: 580, lastRating: '2026-05-20' },
  { name: 'Nick Joseph', rating: 4.82, company: 'Citigroup', sector: 'Real Estate', successRate: 71.6, avgReturn: 11.8, ratings: 720, lastRating: '2026-05-19' },
  { name: 'Jonathan Chappell', rating: 4.82, company: 'Evercore ISI', sector: 'Industrials', successRate: 70.4, avgReturn: 24.7, ratings: 650, lastRating: '2026-05-22' },
  { name: 'Amit Daryanani', rating: 4.81, company: 'Evercore ISI', sector: 'Technology', successRate: 69.1, avgReturn: 26.9, ratings: 1080, lastRating: '2026-05-29' },
  { name: 'Samik Chatterjee', rating: 4.81, company: 'JPMorgan', sector: 'Technology', successRate: 68.6, avgReturn: 25.4, ratings: 940, lastRating: '2026-05-28' },
  { name: 'Tim Long', rating: 4.81, company: 'Barclays', sector: 'Technology', successRate: 67.8, avgReturn: 22.3, ratings: 820, lastRating: '2026-05-26' },
  { name: 'Keith Weiss', rating: 4.80, company: 'Morgan Stanley', sector: 'Technology', successRate: 70.2, avgReturn: 24.1, ratings: 1240, lastRating: '2026-05-30' },
  { name: 'Brent Thill', rating: 4.80, company: 'Jefferies', sector: 'Technology', successRate: 68.3, avgReturn: 23.8, ratings: 1320, lastRating: '2026-05-29' },
  { name: 'Karl Keirstead', rating: 4.80, company: 'UBS', sector: 'Technology', successRate: 67.5, avgReturn: 21.6, ratings: 980, lastRating: '2026-05-28' },
  { name: 'Raimo Lenschow', rating: 4.79, company: 'Barclays', sector: 'Technology', successRate: 69.4, avgReturn: 22.9, ratings: 1110, lastRating: '2026-05-27' },
  { name: 'Kash Rangan', rating: 4.79, company: 'Goldman Sachs', sector: 'Technology', successRate: 66.8, avgReturn: 20.7, ratings: 870, lastRating: '2026-05-26' },
  { name: 'Daniel Ives', rating: 4.79, company: 'Wedbush', sector: 'Technology', successRate: 64.2, avgReturn: 34.8, ratings: 1450, lastRating: '2026-05-30' },
  { name: 'Katy Huberty', rating: 4.78, company: 'Morgan Stanley', sector: 'Technology', successRate: 70.9, avgReturn: 26.3, ratings: 1060, lastRating: '2026-05-25' },
  { name: 'Erik Woodring', rating: 4.78, company: 'Morgan Stanley', sector: 'Technology', successRate: 65.7, avgReturn: 24.5, ratings: 560, lastRating: '2026-05-24' },
  { name: 'Krish Sankar', rating: 4.78, company: 'TD Cowen', sector: 'Technology', successRate: 66.1, avgReturn: 29.4, ratings: 740, lastRating: '2026-05-26' },
  { name: 'Stacy Rasgon', rating: 4.77, company: 'Bernstein', sector: 'Technology', successRate: 71.4, avgReturn: 30.8, ratings: 920, lastRating: '2026-05-28' },
  { name: 'Ross Seymore', rating: 4.77, company: 'Deutsche Bank', sector: 'Technology', successRate: 69.8, avgReturn: 23.2, ratings: 1180, lastRating: '2026-05-27' },
  { name: 'Christopher Rolland', rating: 4.77, company: 'Susquehanna', sector: 'Technology', successRate: 67.3, avgReturn: 27.6, ratings: 680, lastRating: '2026-05-25' },
  { name: 'Matt Ramsay', rating: 4.76, company: 'TD Cowen', sector: 'Technology', successRate: 66.9, avgReturn: 28.1, ratings: 720, lastRating: '2026-05-24' },
  { name: 'C.J. Muse', rating: 4.76, company: 'Cantor Fitzgerald', sector: 'Technology', successRate: 68.7, avgReturn: 31.2, ratings: 830, lastRating: '2026-05-26' },
  { name: 'Joshua Buchalter', rating: 4.76, company: 'TD Cowen', sector: 'Technology', successRate: 65.4, avgReturn: 26.7, ratings: 410, lastRating: '2026-05-23' },
  { name: 'Robbie Marcus', rating: 4.75, company: 'JPMorgan', sector: 'Healthcare', successRate: 72.1, avgReturn: 22.4, ratings: 690, lastRating: '2026-05-27' },
  { name: 'Larry Biegelsen', rating: 4.75, company: 'Wells Fargo', sector: 'Healthcare', successRate: 70.6, avgReturn: 18.9, ratings: 980, lastRating: '2026-05-26' },
  { name: 'Vijay Kumar', rating: 4.75, company: 'Evercore ISI', sector: 'Healthcare', successRate: 71.8, avgReturn: 21.3, ratings: 760, lastRating: '2026-05-28' },
  { name: 'Matt Miksic', rating: 4.74, company: 'Barclays', sector: 'Healthcare', successRate: 68.2, avgReturn: 19.7, ratings: 540, lastRating: '2026-05-24' },
  { name: 'David Risinger', rating: 4.74, company: 'Leerink Partners', sector: 'Healthcare', successRate: 69.5, avgReturn: 23.6, ratings: 820, lastRating: '2026-05-25' },
  { name: 'Mohit Bansal', rating: 4.74, company: 'Wells Fargo', sector: 'Healthcare', successRate: 67.1, avgReturn: 28.4, ratings: 610, lastRating: '2026-05-26' },
  { name: 'Chris Schott', rating: 4.73, company: 'JPMorgan', sector: 'Healthcare', successRate: 70.3, avgReturn: 20.8, ratings: 1140, lastRating: '2026-05-27' },
  { name: 'Umer Raffat', rating: 4.73, company: 'Evercore ISI', sector: 'Healthcare', successRate: 66.4, avgReturn: 35.1, ratings: 720, lastRating: '2026-05-29' },
  { name: 'Salveen Richter', rating: 4.73, company: 'Goldman Sachs', sector: 'Healthcare', successRate: 65.8, avgReturn: 38.7, ratings: 680, lastRating: '2026-05-28' },
  { name: 'Cory Kasimov', rating: 4.72, company: 'Evercore ISI', sector: 'Healthcare', successRate: 64.9, avgReturn: 41.5, ratings: 590, lastRating: '2026-05-26' },
  { name: 'Steven Chubak', rating: 4.72, company: 'Wolfe Research', sector: 'Financials', successRate: 73.1, avgReturn: 15.2, ratings: 870, lastRating: '2026-05-27' },
  { name: 'Brian Bedell', rating: 4.72, company: 'Deutsche Bank', sector: 'Financials', successRate: 71.6, avgReturn: 14.4, ratings: 760, lastRating: '2026-05-25' },
  { name: 'Devin Ryan', rating: 4.71, company: 'Citizens JMP', sector: 'Financials', successRate: 70.2, avgReturn: 17.8, ratings: 640, lastRating: '2026-05-24' },
  { name: 'Christopher Allen', rating: 4.71, company: 'Citigroup', sector: 'Financials', successRate: 69.7, avgReturn: 13.6, ratings: 820, lastRating: '2026-05-26' },
  { name: 'Gerard Cassidy', rating: 4.71, company: 'RBC Capital', sector: 'Financials', successRate: 72.8, avgReturn: 14.9, ratings: 1090, lastRating: '2026-05-28' },
  { name: 'Erika Najarian', rating: 4.70, company: 'UBS', sector: 'Financials', successRate: 71.3, avgReturn: 15.7, ratings: 940, lastRating: '2026-05-27' },
  { name: 'Scott Group', rating: 4.70, company: 'Wolfe Research', sector: 'Industrials', successRate: 70.8, avgReturn: 18.2, ratings: 720, lastRating: '2026-05-25' },
  { name: 'Chris Wetherbee', rating: 4.70, company: 'Wells Fargo', sector: 'Industrials', successRate: 69.4, avgReturn: 17.6, ratings: 810, lastRating: '2026-05-24' },
  { name: 'Tom Wadewitz', rating: 4.69, company: 'UBS', sector: 'Industrials', successRate: 71.1, avgReturn: 19.1, ratings: 760, lastRating: '2026-05-26' },
  { name: 'Jerry Revich', rating: 4.69, company: 'Goldman Sachs', sector: 'Industrials', successRate: 70.5, avgReturn: 20.4, ratings: 890, lastRating: '2026-05-27' },
  { name: 'Tami Zakaria', rating: 4.69, company: 'JPMorgan', sector: 'Industrials', successRate: 68.9, avgReturn: 18.8, ratings: 540, lastRating: '2026-05-23' },
  { name: 'Andrew Kaplowitz', rating: 4.68, company: 'Citigroup', sector: 'Industrials', successRate: 71.7, avgReturn: 17.3, ratings: 820, lastRating: '2026-05-25' },
  { name: 'Julien Dumoulin-Smith', rating: 4.68, company: 'Jefferies', sector: 'Utilities', successRate: 73.4, avgReturn: 15.1, ratings: 980, lastRating: '2026-05-26' },
  { name: 'Jeremy Tonet', rating: 4.68, company: 'JPMorgan', sector: 'Energy', successRate: 72.2, avgReturn: 16.9, ratings: 870, lastRating: '2026-05-27' },
  { name: 'John Mackay', rating: 4.67, company: 'Goldman Sachs', sector: 'Energy', successRate: 70.6, avgReturn: 18.5, ratings: 560, lastRating: '2026-05-24' },
  { name: 'Arun Jayaram', rating: 4.67, company: 'JPMorgan', sector: 'Energy', successRate: 71.4, avgReturn: 19.8, ratings: 740, lastRating: '2026-05-25' },
  { name: 'Scott Hanold', rating: 4.67, company: 'RBC Capital', sector: 'Energy', successRate: 70.1, avgReturn: 17.4, ratings: 690, lastRating: '2026-05-23' },
  { name: 'Lauren Lieberman', rating: 4.66, company: 'Barclays', sector: 'Consumer', successRate: 72.5, avgReturn: 16.3, ratings: 910, lastRating: '2026-05-26' },
  { name: 'Bryan Spillane', rating: 4.66, company: 'Bank of America', sector: 'Consumer', successRate: 71.2, avgReturn: 15.8, ratings: 1020, lastRating: '2026-05-27' },
  { name: 'Andrea Teixeira', rating: 4.66, company: 'JPMorgan', sector: 'Consumer', successRate: 70.8, avgReturn: 17.1, ratings: 980, lastRating: '2026-05-25' },
  { name: 'Robert Ottenstein', rating: 4.65, company: 'Evercore ISI', sector: 'Consumer', successRate: 73.1, avgReturn: 18.4, ratings: 720, lastRating: '2026-05-24' },
  { name: 'Peter Grom', rating: 4.65, company: 'UBS', sector: 'Consumer', successRate: 69.6, avgReturn: 16.7, ratings: 640, lastRating: '2026-05-23' },
  { name: 'Rupesh Parikh', rating: 4.65, company: 'Oppenheimer', sector: 'Consumer', successRate: 70.4, avgReturn: 19.2, ratings: 760, lastRating: '2026-05-26' },
  { name: 'Connor Rattigan', rating: 4.64, company: 'Deutsche Bank', sector: 'Materials', successRate: 68.7, avgReturn: 20.6, ratings: 410, lastRating: '2026-05-22' },
  { name: 'Michael Sison', rating: 4.64, company: 'Wells Fargo', sector: 'Materials', successRate: 71.9, avgReturn: 17.9, ratings: 690, lastRating: '2026-05-24' },
  { name: 'Vincent Andrews', rating: 4.64, company: 'Morgan Stanley', sector: 'Materials', successRate: 70.3, avgReturn: 16.4, ratings: 820, lastRating: '2026-05-25' },
  { name: 'Ronald Kamdem', rating: 4.63, company: 'Morgan Stanley', sector: 'Real Estate', successRate: 72.6, avgReturn: 13.7, ratings: 760, lastRating: '2026-05-26' },
  { name: 'Vikram Malhotra', rating: 4.63, company: 'Mizuho', sector: 'Real Estate', successRate: 71.1, avgReturn: 12.8, ratings: 540, lastRating: '2026-05-23' },
  { name: 'John Kim', rating: 4.63, company: 'BMO Capital', sector: 'Real Estate', successRate: 70.7, avgReturn: 14.2, ratings: 680, lastRating: '2026-05-25' },
  { name: 'Jonathan Atkin', rating: 4.62, company: 'RBC Capital', sector: 'Communication', successRate: 71.8, avgReturn: 22.6, ratings: 720, lastRating: '2026-05-27' },
  { name: 'Michael Rollins', rating: 4.62, company: 'Citigroup', sector: 'Communication', successRate: 70.2, avgReturn: 18.4, ratings: 870, lastRating: '2026-05-26' },
  { name: 'Benjamin Swinburne', rating: 4.62, company: 'Morgan Stanley', sector: 'Communication', successRate: 69.5, avgReturn: 24.1, ratings: 940, lastRating: '2026-05-28' },
  { name: 'Steven Cahall', rating: 4.61, company: 'Wells Fargo', sector: 'Communication', successRate: 67.9, avgReturn: 25.8, ratings: 760, lastRating: '2026-05-25' },
  { name: 'Durga Sivaraman', rating: 4.61, company: 'Truist Securities', sector: 'Utilities', successRate: 72.3, avgReturn: 14.7, ratings: 480, lastRating: '2026-05-22' },
  { name: 'Nicholas Campanella', rating: 4.61, company: 'Barclays', sector: 'Utilities', successRate: 71.6, avgReturn: 13.9, ratings: 620, lastRating: '2026-05-24' },
  { name: 'Carly Davenport', rating: 4.60, company: 'Goldman Sachs', sector: 'Utilities', successRate: 70.9, avgReturn: 15.3, ratings: 560, lastRating: '2026-05-25' },
  { name: 'Anthony Crowdell', rating: 4.60, company: 'Mizuho', sector: 'Utilities', successRate: 70.1, avgReturn: 14.1, ratings: 640, lastRating: '2026-05-23' },
]

// ============================================================================
// Coverage universe — representative stocks each analyst follows, by sector.
// Used to derive which companies/tickers analysts cover and their buy/sell calls.
// ============================================================================
const SECTOR_UNIVERSE: Record<AnalystSector, Array<[string, string]>> = {
  Technology: [
    ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'Nvidia'], ['AVGO', 'Broadcom'],
    ['AMD', 'AMD'], ['ORCL', 'Oracle'], ['CRM', 'Salesforce'], ['ADBE', 'Adobe'],
    ['INTC', 'Intel'], ['QCOM', 'Qualcomm'], ['MU', 'Micron'], ['PLTR', 'Palantir'],
    ['SMCI', 'Super Micro'], ['NOW', 'ServiceNow'], ['CSCO', 'Cisco'], ['TXN', 'Texas Instruments'],
    ['AMAT', 'Applied Materials'], ['LRCX', 'Lam Research'], ['ASML', 'ASML'], ['DELL', 'Dell'],
  ],
  Healthcare: [
    ['LLY', 'Eli Lilly'], ['UNH', 'UnitedHealth'], ['JNJ', 'Johnson & Johnson'], ['MRK', 'Merck'],
    ['ABBV', 'AbbVie'], ['PFE', 'Pfizer'], ['TMO', 'Thermo Fisher'], ['ABT', 'Abbott'],
    ['DHR', 'Danaher'], ['AMGN', 'Amgen'], ['ISRG', 'Intuitive Surgical'], ['VRTX', 'Vertex'],
    ['GILD', 'Gilead'], ['REGN', 'Regeneron'], ['BSX', 'Boston Scientific'], ['MDT', 'Medtronic'],
    ['CVS', 'CVS Health'], ['BMY', 'Bristol Myers'],
  ],
  Financials: [
    ['JPM', 'JPMorgan'], ['BAC', 'Bank of America'], ['WFC', 'Wells Fargo'], ['GS', 'Goldman Sachs'],
    ['MS', 'Morgan Stanley'], ['C', 'Citigroup'], ['BLK', 'BlackRock'], ['SCHW', 'Charles Schwab'],
    ['AXP', 'American Express'], ['SPGI', 'S&P Global'], ['BX', 'Blackstone'], ['KKR', 'KKR'],
    ['USB', 'U.S. Bancorp'], ['PNC', 'PNC Financial'], ['COF', 'Capital One'],
  ],
  Industrials: [
    ['CAT', 'Caterpillar'], ['BA', 'Boeing'], ['GE', 'GE Aerospace'], ['HON', 'Honeywell'],
    ['UNP', 'Union Pacific'], ['RTX', 'RTX'], ['DE', 'Deere'], ['LMT', 'Lockheed Martin'],
    ['UPS', 'UPS'], ['ETN', 'Eaton'], ['EMR', 'Emerson'], ['GD', 'General Dynamics'],
    ['CSX', 'CSX'], ['NOC', 'Northrop Grumman'], ['MMM', '3M'],
  ],
  Energy: [
    ['XOM', 'Exxon Mobil'], ['CVX', 'Chevron'], ['COP', 'ConocoPhillips'], ['SLB', 'Schlumberger'],
    ['EOG', 'EOG Resources'], ['MPC', 'Marathon Petroleum'], ['PSX', 'Phillips 66'], ['OXY', 'Occidental'],
    ['WMB', 'Williams'], ['KMI', 'Kinder Morgan'], ['VLO', 'Valero'], ['HAL', 'Halliburton'],
    ['DVN', 'Devon Energy'],
  ],
  Consumer: [
    ['AMZN', 'Amazon'], ['TSLA', 'Tesla'], ['HD', 'Home Depot'], ['MCD', "McDonald's"],
    ['NKE', 'Nike'], ['SBUX', 'Starbucks'], ['LOW', "Lowe's"], ['TGT', 'Target'],
    ['COST', 'Costco'], ['WMT', 'Walmart'], ['PG', 'Procter & Gamble'], ['KO', 'Coca-Cola'],
    ['PEP', 'PepsiCo'], ['MDLZ', 'Mondelez'], ['CL', 'Colgate-Palmolive'],
  ],
  Communication: [
    ['GOOGL', 'Alphabet'], ['META', 'Meta'], ['NFLX', 'Netflix'], ['DIS', 'Disney'],
    ['CMCSA', 'Comcast'], ['T', 'AT&T'], ['VZ', 'Verizon'], ['TMUS', 'T-Mobile'],
    ['CHTR', 'Charter'], ['EA', 'Electronic Arts'], ['WBD', 'Warner Bros Discovery'], ['TTWO', 'Take-Two'],
  ],
  Materials: [
    ['LIN', 'Linde'], ['FCX', 'Freeport-McMoRan'], ['NEM', 'Newmont'], ['SHW', 'Sherwin-Williams'],
    ['APD', 'Air Products'], ['ECL', 'Ecolab'], ['DOW', 'Dow'], ['DD', 'DuPont'],
    ['NUE', 'Nucor'], ['CTVA', 'Corteva'], ['ALB', 'Albemarle'],
  ],
  'Real Estate': [
    ['PLD', 'Prologis'], ['AMT', 'American Tower'], ['EQIX', 'Equinix'], ['WELL', 'Welltower'],
    ['SPG', 'Simon Property'], ['O', 'Realty Income'], ['PSA', 'Public Storage'], ['CCI', 'Crown Castle'],
    ['DLR', 'Digital Realty'], ['VICI', 'VICI Properties'],
  ],
  Utilities: [
    ['NEE', 'NextEra Energy'], ['DUK', 'Duke Energy'], ['SO', 'Southern Company'], ['D', 'Dominion'],
    ['AEP', 'American Electric'], ['EXC', 'Exelon'], ['SRE', 'Sempra'], ['XEL', 'Xcel Energy'],
    ['ED', 'Consolidated Edison'], ['PEG', 'Public Service Enterprise'],
  ],
}

// Approximate reference prices to derive plausible price targets (curated, static).
const REF_PRICE: Record<string, number> = {
  AAPL: 228, MSFT: 470, NVDA: 135, AVGO: 235, AMD: 165, ORCL: 175, CRM: 320, ADBE: 540,
  INTC: 23, QCOM: 170, MU: 105, PLTR: 38, SMCI: 45, NOW: 1000, CSCO: 58, TXN: 200,
  AMAT: 215, LRCX: 95, ASML: 980, DELL: 130, LLY: 870, UNH: 520, JNJ: 158, MRK: 105,
  ABBV: 185, PFE: 28, TMO: 600, ABT: 115, DHR: 250, AMGN: 320, ISRG: 480, VRTX: 480,
  GILD: 90, REGN: 1080, BSX: 88, MDT: 88, CVS: 62, BMY: 52, JPM: 215, BAC: 42, WFC: 62,
  GS: 500, MS: 105, C: 65, BLK: 950, SCHW: 72, AXP: 270, SPGI: 510, BX: 145, KKR: 130,
  USB: 45, PNC: 185, COF: 165, CAT: 360, BA: 180, GE: 175, HON: 215, UNP: 235, RTX: 120,
  DE: 410, LMT: 480, UPS: 130, ETN: 320, EMR: 115, GD: 290, CSX: 33, NOC: 480, MMM: 130,
  XOM: 115, CVX: 155, COP: 105, SLB: 43, EOG: 125, MPC: 165, PSX: 130, OXY: 52, WMB: 48,
  KMI: 26, VLO: 145, HAL: 32, DVN: 42, AMZN: 185, TSLA: 250, HD: 365, MCD: 295, NKE: 78,
  SBUX: 95, LOW: 245, TGT: 145, COST: 880, WMT: 80, PG: 168, KO: 62, PEP: 170, MDLZ: 68,
  CL: 95, GOOGL: 175, META: 580, NFLX: 700, DIS: 95, CMCSA: 40, T: 22, VZ: 42, TMUS: 195,
  CHTR: 360, EA: 145, WBD: 9, TTWO: 165, LIN: 460, FCX: 45, NEM: 45, SHW: 360, APD: 290,
  ECL: 240, DOW: 50, DD: 85, NUE: 150, CTVA: 60, ALB: 95, PLD: 115, AMT: 200, EQIX: 870,
  WELL: 120, SPG: 165, O: 58, PSA: 320, CCI: 105, DLR: 150, VICI: 30, NEE: 78, DUK: 110,
  SO: 88, D: 52, AEP: 95, EXC: 38, SRE: 78, XEL: 62, ED: 98, PEG: 80,
}

// Deterministic seeded RNG so coverage is stable across requests/renders.
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildCoverage(name: string, sector: AnalystSector, avgReturn: number, lastRating: string): Coverage[] {
  const rng = mulberry32(hashStr(name + '|' + sector))
  const pool = [...SECTOR_UNIVERSE[sector]]
  // Shuffle deterministically
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const n = 5 + Math.floor(rng() * 5) // 5–9 covered names
  const picks = pool.slice(0, Math.min(n, pool.length))
  const baseDate = new Date(lastRating).getTime() || Date.now()

  return picks.map(([ticker, company]) => {
    const r = rng()
    // Skew bullish: ~58% Buy, ~30% Hold, ~12% Sell
    const action: RatingAction = r < 0.58 ? 'Buy' : r < 0.88 ? 'Hold' : 'Sell'
    const variance = (rng() - 0.5) * avgReturn * 0.9
    let expected =
      action === 'Buy' ? avgReturn * (0.6 + rng() * 0.9) + Math.abs(variance)
      : action === 'Sell' ? -(Math.abs(avgReturn) * (0.3 + rng() * 0.6))
      : (rng() - 0.5) * Math.max(6, avgReturn * 0.4)
    expected = Math.round(expected * 10) / 10
    const ref = REF_PRICE[ticker] || 100
    const priceTarget = Math.round(ref * (1 + expected / 100) * 100) / 100
    const date = new Date(baseDate - Math.floor(rng() * 60) * 86400000).toISOString().slice(0, 10)
    return { ticker, company, action, expectedReturn: expected, priceTarget, date }
  }).sort((a, b) => b.expectedReturn - a.expectedReturn)
}

export function buildLeaderboard(): Analyst[] {
  const sorted = [...ROSTER].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    if (b.successRate !== a.successRate) return b.successRate - a.successRate
    return b.avgReturn - a.avgReturn
  })
  return sorted.map((a, i) => ({
    id: `${a.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    ...a,
    coverage: buildCoverage(a.name, a.sector, a.avgReturn, a.lastRating),
  }))
}

export const ANALYST_SECTORS: AnalystSector[] = [
  'Technology',
  'Healthcare',
  'Financials',
  'Industrials',
  'Energy',
  'Consumer',
  'Communication',
  'Materials',
  'Real Estate',
  'Utilities',
]
