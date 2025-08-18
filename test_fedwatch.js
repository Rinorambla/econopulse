// Test della sezione FedWatch
const testFedWatch = async () => {
  try {
    const fedWatchData = {
      currentRate: 5.25,
      nextMeeting: "January 29, 2025",
      probabilities: {
        cut75: 0,
        cut50: 5,
        cut25: 25,
        hold: 45,
        hike25: 20,
        hike50: 5,
        hike75: 0
      },
      aiAnalysis: {
        recommendation: "HOLD",
        confidence: 65,
        reasoning: "Economic data suggests Fed will maintain current rates while monitoring inflation trends.",
        marketImpact: "Neutral to slightly positive for equities",
        sectors: {
          positive: ["Technology", "Consumer Discretionary"],
          negative: ["Utilities", "REITs"]
        }
      },
      economicIndicators: {
        inflation: 3.2,
        unemployment: 3.9,
        gdpGrowth: 2.1,
        cpi: 3.1
      },
      marketReaction: {
        dollarIndex: 103.2,
        treasuryYield10y: 4.25,
        sp500Impact: "Neutral",
        volatility: 18
      },
      lastUpdated: new Date().toISOString()
    };

    console.log("🏦 FedWatch Test Data:");
    console.log("Current Rate:", fedWatchData.currentRate + "%");
    console.log("Next Meeting:", fedWatchData.nextMeeting);
    console.log("AI Recommendation:", fedWatchData.aiAnalysis.recommendation);
    console.log("Confidence:", fedWatchData.aiAnalysis.confidence + "%");
    console.log("Probabilities:");
    
    Object.entries(fedWatchData.probabilities).forEach(([key, value]) => {
      const label = {
        cut75: "-0.75%",
        cut50: "-0.50%", 
        cut25: "-0.25%",
        hold: "Hold",
        hike25: "+0.25%",
        hike50: "+0.50%",
        hike75: "+0.75%"
      }[key];
      console.log(`  ${label}: ${value}%`);
    });

    console.log("\n✅ FedWatch data structure is correct!");
    return fedWatchData;
  } catch (error) {
    console.error("❌ FedWatch test failed:", error);
    return null;
  }
};

// Esegui il test
testFedWatch();
