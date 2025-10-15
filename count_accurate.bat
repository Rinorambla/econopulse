@echo off
echo === CONTEGGIO ACCURATO SIMBOLI PER CATEGORIA ===
echo.

echo Technology:
findstr /c "': 'Technology'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Technology ETF:
findstr /c "': 'Technology ETF'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Financial Services:
findstr /c "': 'Financial Services'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Financial ETF:
findstr /c "': 'Financial ETF'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Healthcare:
findstr /c "': 'Healthcare'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Healthcare ETF:
findstr /c "': 'Healthcare ETF'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Consumer Discretionary:
findstr /c "': 'Consumer Discretionary'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Consumer Staples:
findstr /c "': 'Consumer Staples'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Energy:
findstr /c "': 'Energy'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Real Estate:
findstr /c "': 'Real Estate'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Currency ETF:
findstr /c "': 'Currency ETF'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Crypto:
findstr /c "': 'Crypto" src\app\api\dashboard-data\route.ts | find /c ":"

echo Bond:
findstr /c "': 'Bond'," src\app\api\dashboard-data\route.ts | find /c ":"

echo Index:
findstr /c "': 'Index'," src\app\api\dashboard-data\route.ts | find /c ":"

echo.
echo === TOTALE SIMBOLI NELL'ARRAY ===
findstr /c "'" src\app\api\dashboard-data\route.ts | findstr /v "//" | find /c "'"
