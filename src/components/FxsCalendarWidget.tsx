'use client';

// FXStreet economic-calendar widget, restyled to match the EconoPulse dark theme.
// The widget renders into the regular DOM (no iframe/shadow root), so plain CSS
// overrides scoped under .fxs-dark are enough to re-theme it.
import React, { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://staticcontent.fxsstatic.com/widgets-v2/stable/fxs-widgets.js';

const DARK_CSS = `
.fxs-dark { color-scheme: dark; }
.fxs-dark .fxs_widget, .fxs-dark .fxs_c_calendar_wrapper, .fxs-dark .fxs_c_ecocal,
.fxs-dark .fxs_c_ecocal_data, .fxs-dark .fxs_c_table, .fxs-dark .fxs_c_dashboard {
  background: transparent !important; color: #e2e8f0 !important;
}
.fxs-dark .fxs_c_table .fxs_c_row { background: transparent !important; border-color: #1e293b !important; }
.fxs-dark .fxs_c_table .fxs_c_row:hover { background: rgba(30,41,59,.5) !important; }
.fxs-dark .fxs_c_header, .fxs-dark .fxs_c_header * { background: #0b1322 !important; color: #94a3b8 !important; border-color: #1e293b !important; }
.fxs-dark .fxs_c_period, .fxs-dark .fxs_c_period * { background: #111c30 !important; color: #93c5fd !important; border-color: #1e293b !important; font-weight: 700; }
.fxs-dark .fxs_c_item, .fxs-dark .fxs_c_textnode, .fxs-dark .fxs_c_name, .fxs-dark .fxs_c_time { color: #e2e8f0 !important; }
.fxs-dark .fxs_c_currency { color: #cbd5e1 !important; }
.fxs-dark .fxs_c_item_event_name a, .fxs-dark .fxs_c_name a { color: #e2e8f0 !important; text-decoration: none; }
.fxs-dark .fxs_c_previous, .fxs-dark .fxs_c_consensus { color: #94a3b8 !important; }
.fxs-dark .fxs_c_now, .fxs-dark .fxs_c_now * { background: rgba(59,130,246,.15) !important; }
.fxs-dark .fxs_btn, .fxs-dark .fxs_selectable-trigger, .fxs-dark .fxs_c_datepicker_trigger_button {
  background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important;
}
.fxs-dark .fxs_btn:hover { background: #334155 !important; }
.fxs-dark .fxs_c_configuration_rollover, .fxs-dark .fxs_c_configuration_rollover_main,
.fxs-dark .fxs_c_configuration_rollover_footer, .fxs-dark .fxs_selectable-wrapper > div {
  background: #0f172a !important; color: #e2e8f0 !important; border-color: #334155 !important;
}
.fxs-dark .fxs_c_label_info_background { background: #1e293b !important; color: #93c5fd !important; }
.fxs-dark table, .fxs-dark td, .fxs-dark th { border-color: #1e293b !important; }
.fxs-dark .fxs_c_ecocal_data_shadow { box-shadow: none !important; }
`;

export default function FxsCalendarWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The loader scans the DOM when it runs; (re)append the widget tag after mount
    // and load the script once per page.
    const host = containerRef.current;
    if (!host) return;
    host.innerHTML = '';
    const widget = document.createElement('div');
    widget.setAttribute('fxs-widget', '');
    widget.setAttribute('name', 'calendar');
    host.appendChild(widget);

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!existing) {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // Script already present (tab re-opened): nudge the loader to rescan if it
      // exposes a global, otherwise re-adding the script is a no-op — simplest
      // reliable rescan is re-appending a fresh clone.
      const clone = document.createElement('script');
      clone.src = `${SCRIPT_SRC}?rescan=${Date.now()}`;
      clone.defer = true;
      document.body.appendChild(clone);
      return () => { clone.remove(); };
    }
  }, []);

  return (
    <div className="fxs-dark rounded-xl border border-slate-800 bg-slate-900/40 p-3 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: DARK_CSS }} />
      <div ref={containerRef} />
      <div className="pt-2 text-right text-[10px] text-gray-600">Calendar widget by FXStreet</div>
    </div>
  );
}
