"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import RequirePlan from "@/components/RequirePlan";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const ScatterChart = dynamic(() => import("recharts").then((mod) => mod.ScatterChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const Scatter = dynamic(() => import("recharts").then((mod) => mod.Scatter), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend as any), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });

type TabType = "all" | "macro" | "markets" | "commodities" | "policy";

interface WidgetData {
  id: string;
  title: string;
  category: TabType;
  endpoint: string;
  chartType: "bar" | "line" | "scatter";
  xKey: string;
  yKey: string;
  data: any[];
  loading: boolean;
  error: string | null;
}

const WIDGETS: Omit<WidgetData, "data" | "loading" | "error">[] = [
  { id: "population", title: "Global Population", category: "macro", endpoint: "/api/visual-ai/population", chartType: "bar", xKey: "country", yKey: "population" },
  { id: "gdp", title: "GDP Growth", category: "macro", endpoint: "/api/visual-ai/gdp", chartType: "bar", xKey: "country", yKey: "gdpGrowth" },
  { id: "trade", title: "Trade Balance", category: "macro", endpoint: "/api/visual-ai/trade", chartType: "bar", xKey: "country", yKey: "tradeBalance" },
  { id: "pmi", title: "PMI Indices", category: "macro", endpoint: "/api/visual-ai/pmi", chartType: "bar", xKey: "country", yKey: "composite" },
  { id: "yields", title: "Bond Yields", category: "macro", endpoint: "/api/visual-ai/yields", chartType: "line", xKey: "maturity", yKey: "us" },
  { id: "stocks", title: "Stock Indices", category: "markets", endpoint: "/api/visual-ai/stocks", chartType: "bar", xKey: "country", yKey: "pe" },
  { id: "currencies", title: "Currency Pairs", category: "markets", endpoint: "/api/visual-ai/currencies", chartType: "bar", xKey: "currencyCode", yKey: "exchangeRate" },
  { id: "energy", title: "Energy Prices", category: "commodities", endpoint: "/api/visual-ai/energy", chartType: "bar", xKey: "commodity", yKey: "price" },
  { id: "agriculture", title: "Agricultural Commodities", category: "commodities", endpoint: "/api/visual-ai/agriculture", chartType: "bar", xKey: "commodity", yKey: "price" },
  { id: "metals", title: "Precious Metals", category: "commodities", endpoint: "/api/visual-ai/metals", chartType: "bar", xKey: "metal", yKey: "price" },
  { id: "debt", title: "Government Debt", category: "policy", endpoint: "/api/visual-ai/debt", chartType: "bar", xKey: "country", yKey: "debtToGdp" },
  { id: "central-bank", title: "Central Bank Rates", category: "policy", endpoint: "/api/visual-ai/central-bank", chartType: "bar", xKey: "bank", yKey: "currentRate" },
  { id: "fed-tools", title: "Fed Tools", category: "policy", endpoint: "/api/visual-ai/fed-tools", chartType: "bar", xKey: "label", yKey: "value" },
  { id: "recession-prob", title: "Recession Probability", category: "policy", endpoint: "/api/visual-ai/global-recession-probability", chartType: "line", xKey: "date", yKey: "probability" },
  { id: "cot-flow", title: "COT Flows", category: "markets", endpoint: "/api/visual-ai/cot-flow", chartType: "bar", xKey: "market", yKey: "nonCommercialNet" },
  { id: "geopolitical", title: "Geopolitical Risk", category: "policy", endpoint: "/api/visual-ai/geopolitical-risk", chartType: "line", xKey: "date", yKey: "gpr" },
];

export default function VisualAIPage() {
  const t = useTranslations("VisualAI");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [widgets, setWidgets] = useState<WidgetData[]>(
    WIDGETS.map((w) => ({ ...w, data: [], loading: false, error: null, xKey: w.xKey, yKey: w.yKey }))
  );
  const [selectedWidget, setSelectedWidget] = useState<WidgetData | null>(null);

  useEffect(() => {
    loadVisibleWidgets();
  }, [activeTab]);

  const loadVisibleWidgets = async () => {
    const visibleWidgets = activeTab === "all" 
      ? widgets 
      : widgets.filter((w) => w.category === activeTab);

    for (const widget of visibleWidgets) {
      if (widget.data.length === 0 && !widget.loading) {
        fetchWidgetData(widget.id);
      }
    }
  };

  const fetchWidgetData = async (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, loading: true, error: null } : w))
    );

    try {
      const widget = widgets.find((w) => w.id === widgetId);
      if (!widget) return;

      const response = await fetch(widget.endpoint);
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      let chartData: any[] = [];

      if (widgetId === "recession-prob") {
        chartData = data.history || data.data || [];
      } else if (widgetId === "fed-tools") {
        chartData = (data.data || []).map((s: any) => ({
          label: s.label || s.id,
          value: s.latest?.value ?? 0,
          unit: s.unit,
        }));
      } else {
        chartData = data.data || [];
      }

      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, data: chartData, loading: false } : w))
      );
    } catch (error) {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId
            ? { ...w, loading: false, error: error instanceof Error ? error.message : "Failed to load" }
            : w
        )
      );
    }
  };

  const filteredWidgets = activeTab === "all" 
    ? widgets 
    : widgets.filter((w) => w.category === activeTab);

  const renderMiniChart = (widget: WidgetData) => {
    if (widget.loading) {
      return (
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (widget.error) {
      return (
        <div className="h-24 flex items-center justify-center text-red-400 text-sm">
          {widget.error}
        </div>
      );
    }

    if (!widget.data || widget.data.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      );
    }

    const chartData = widget.data.slice(-10);

    if (widget.chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={96}>
          <LineChart data={chartData}>
            <Line type="monotone" dataKey={widget.yKey} stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (widget.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={96}>
          <BarChart data={chartData}>
            <Bar dataKey={widget.yKey} fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={96}>
        <ScatterChart data={chartData}>
          <Scatter dataKey={widget.yKey} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderFullChart = (widget: WidgetData) => {
    if (!widget.data || widget.data.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-400">
          No data available
        </div>
      );
    }

    if (widget.chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={widget.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={widget.xKey} stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
            <Legend />
            <Line type="monotone" dataKey={widget.yKey} stroke="#3b82f6" strokeWidth={2} name={widget.title} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (widget.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={widget.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={widget.xKey} stroke="#9ca3af" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
            <Legend />
            <Bar dataKey={widget.yKey} fill="#3b82f6" name={widget.title} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={widget.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="x" stroke="#9ca3af" />
          <YAxis dataKey="y" stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
          <Scatter dataKey={widget.yKey} fill="#3b82f6" name={widget.title} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  return (
    <RequirePlan min="premium">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Visual AI Dashboard
            </h1>
            <p className="text-gray-400">
              Real-time economic and market visualizations powered by AI
            </p>
          </header>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {(["all", "macro", "markets", "commodities", "policy"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={"px-6 py-2 rounded-lg font-medium transition-all whitespace-nowrap " + (
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWidgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/20"
                onClick={() => setSelectedWidget(widget)}
              >
                <h3 className="text-lg font-semibold mb-4 text-blue-400">{widget.title}</h3>
                {renderMiniChart(widget)}
              </div>
            ))}
          </div>
        </div>

        {selectedWidget && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedWidget(null)}
          >
            <div
              className="bg-gray-900 rounded-2xl p-8 max-w-4xl w-full border border-gray-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-blue-400">{selectedWidget.title}</h2>
                <button
                  onClick={() => setSelectedWidget(null)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              {renderFullChart(selectedWidget)}
            </div>
          </div>
        )}
      </div>
    </RequirePlan>
  );
}
