// Script per testare i settori che arrivano dal dashboard API
console.log('🔍 Testing Dashboard API sectors...');

fetch('http://localhost:3000/api/dashboard-data')
  .then(response => response.json())
  .then(data => {
    console.log('📊 Dashboard API Response received');
    
    if (data.data && data.data.length > 0) {
      // Estrai tutti i settori unici
      const allSectors = data.data
        .map(item => item.sector)
        .filter(sector => sector) // Rimuovi valori null/undefined
        .reduce((acc, sector) => {
          acc[sector] = (acc[sector] || 0) + 1;
          return acc;
        }, {});
      
      console.log('\n🏢 SETTORI TROVATI NEL DASHBOARD:');
      console.log('='.repeat(50));
      
      Object.entries(allSectors)
        .sort(([,a], [,b]) => b - a) // Ordina per numero di simboli
        .forEach(([sector, count]) => {
          console.log(`${sector.padEnd(30)}: ${count} simboli`);
        });
        
      console.log('='.repeat(50));
      console.log(`TOTALE SETTORI UNICI: ${Object.keys(allSectors).length}`);
      console.log(`TOTALE SIMBOLI CON SETTORE: ${Object.values(allSectors).reduce((a, b) => a + b, 0)}`);
      console.log(`TOTALE SIMBOLI NEL DASHBOARD: ${data.data.length}`);
      
      // Controlla alcuni simboli specifici
      console.log('\n🔍 ESEMPI DI SIMBOLI CON SETTORI:');
      data.data.slice(0, 10).forEach(item => {
        console.log(`${item.ticker.padEnd(8)}: ${item.sector || 'NO SECTOR'}`);
      });
      
    } else {
      console.log('❌ Nessun dato ricevuto dal dashboard API');
    }
  })
  .catch(error => {
    console.error('❌ Errore nel test:', error);
  });
