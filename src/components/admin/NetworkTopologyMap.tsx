import React, { useState } from 'react';
import {
  Server,
  Usb,
  Bluetooth,
  Wifi,
  Zap,
  Printer,
  Scan,
  Banknote,
  CreditCard,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { HardwarePeripheralStatus } from '../../../server/services/infrastructureAiService';
import { useTheme } from '../../context/ThemeContext';

export interface NetworkTopologyMapProps {
  peripherals: HardwarePeripheralStatus[];
}

export const NetworkTopologyMap: React.FC<NetworkTopologyMapProps> = ({ peripherals }) => {
  const { theme, currentPreset } = useTheme();
  const [selectedInterface, setSelectedInterface] = useState<'all' | 'USB' | 'Bluetooth_LE' | 'Ethernet' | 'RJ12_Drawer_Kick'>('all');
  const [hoveredPeripheralId, setHoveredPeripheralId] = useState<string | null>(null);

  const primaryColor = currentPreset.primary;
  const secondaryColor = currentPreset.primaryDark; // Adjust based on preset
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const mutedColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const borderColor = currentPreset.border;

  const filteredPeripherals = peripherals.filter((p) => {
    if (selectedInterface === 'all') return true;
    return p.connectivity.interface === selectedInterface;
  });

  // Hub coordinates (POS Terminal Core)
  const hubX = 400;
  const hubY = 180;

  // Compute radial positions for peripherals
  const total = filteredPeripherals.length;
  const radius = 240;

  const positionedPeripherals = filteredPeripherals.map((p, idx) => {
    const angle = total === 1 ? Math.PI / 2 : (idx / total) * 2 * Math.PI - Math.PI / 2;
    const x = Math.round(hubX + radius * Math.cos(angle));
    const y = Math.round(hubY + radius * Math.sin(angle) * 0.75 + 20); // slightly elliptic
    return { peripheral: p, x, y };
  });

  return (
    <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm p-6 space-y-5">
      {/* Header & Interface Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              POS Hardware Network Topology & Connection Path
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
              USB vs Bluetooth vs RJ12
            </span>
          </div>
          <p className="text-xs text-text/60 mt-1">
            แผนผังโครงสร้างการเชื่อมต่อเครือข่ายฮาร์ดแวร์ (Topology Map) แสดงเส้นทางการรับส่งสัญญาณแบบเรียลไทม์ระหว่างเครื่อง POS Core กับอุปกรณ์ต่อพ่วง
          </p>
        </div>

        {/* Interface Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-background border border-border border-crisp text-xs">
          {[
            { id: 'all', label: 'ทั้งหมด (All)' },
            { id: 'USB', label: 'USB (Bus)' },
            { id: 'Bluetooth_LE', label: 'Bluetooth LE' },
            { id: 'Ethernet', label: 'Ethernet' },
            { id: 'RJ12_Drawer_Kick', label: 'RJ12 Drawer' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedInterface(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedInterface === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-text/70 hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Topology Map */}
      <div className="relative w-full rounded-2xl bg-slate-950 border border-indigo-500/30 overflow-hidden shadow-inner flex items-center justify-center p-4">
        {/* Background Grid & Radar Sweep Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950/90 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <svg viewBox="0 0 800 420" className="w-full h-auto max-h-[460px] relative z-10 select-none">
          <defs>
            {/* Glow Filter */}
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradient Paths */}
            <linearGradient id="usb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
            <linearGradient id="ble-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={primaryColor} />
            </linearGradient>
            <linearGradient id="rj12-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Connection Lines from Hub to Peripherals */}
          {positionedPeripherals.map(({ peripheral, x, y }) => {
            const isHovered = hoveredPeripheralId === peripheral.id;
            const isUsb = peripheral.connectivity.interface === 'USB';
            const isBle = peripheral.connectivity.interface === 'Bluetooth_LE';
            const isDrawer = peripheral.connectivity.interface === 'RJ12_Drawer_Kick';
            const strokeColor = isUsb ? primaryColor : isBle ? secondaryColor : isDrawer ? '#f59e0b' : '#10b981';

            // Control point for smooth curved Bézier connection
            const cx = (hubX + x) / 2;
            const cy = (hubY + y) / 2 - 30;

            return (
              <g key={`path-${peripheral.id}`}>
                {/* Background Shadow Line */}
                <path
                  d={`M ${hubX} ${hubY} Q ${cx} ${cy} ${x} ${y}`}
                  fill="none"
                  stroke={theme === 'dark' ? '#334155' : '#cbd5e1'}
                  strokeWidth={isHovered ? 4 : 2}
                  strokeOpacity={0.6}
                />
                {/* Animated Flow Dash Line */}
                <path
                  d={`M ${hubX} ${hubY} Q ${cx} ${cy} ${x} ${y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  strokeDasharray="8 8"
                  className="animate-topology-flow"
                  filter="url(#neon-glow)"
                />
                {/* Packet Node Pulsing on Path */}
                <circle r="4" fill={strokeColor} filter="url(#neon-glow)">
                  <animateMotion
                    path={`M ${hubX} ${hubY} Q ${cx} ${cy} ${x} ${y}`}
                    dur={`${2 + (peripheral.id.charCodeAt(0) % 3)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}

          {/* Central POS Terminal Hub Node */}
          <g transform={`translate(${hubX}, ${hubY})`} filter="url(#neon-glow)">
            {/* Radar Pulse Rings */}
            <circle r="55" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeOpacity="0.3" className="animate-ping" />
            <circle r="42" fill={currentPreset.card} stroke={primaryColor} strokeWidth="2" />
            <circle r="34" fill={currentPreset.background} stroke={primaryColor} strokeWidth="1.5" />
            {/* Hub Icon / Server Core */}
            <foreignObject x="-20" y="-20" width="40" height="40">
              <div className="w-full h-full flex items-center justify-center" style={{ color: primaryColor }}>
                <Server className="w-6 h-6 animate-pulse" />
              </div>
            </foreignObject>
            {/* Hub Label */}
            <text x="0" y="52" textAnchor="middle" fill={textColor} fontSize="11" fontWeight="bold" fontFamily="monospace">
              POS CORE HOST (PRODX)
            </text>
            <text x="0" y="66" textAnchor="middle" fill={mutedColor} fontSize="9" fontFamily="monospace">
              IP: 192.168.1.100 • Online
            </text>
          </g>

          {/* Peripheral Node Cards */}
          {positionedPeripherals.map(({ peripheral, x, y }) => {
            const isHovered = hoveredPeripheralId === peripheral.id;
            const isUsb = peripheral.connectivity.interface === 'USB';
            const isBle = peripheral.connectivity.interface === 'Bluetooth_LE';
            const isDrawer = peripheral.connectivity.interface === 'RJ12_Drawer_Kick';
            const badgeColor = isUsb ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : isBle ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : isDrawer ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

            return (
              <g
                key={`node-${peripheral.id}`}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHoveredPeripheralId(peripheral.id)}
                onMouseLeave={() => setHoveredPeripheralId(null)}
                className="cursor-pointer transition-transform"
              >
                {/* Node Outer Selection Glow */}
                {isHovered && (
                  <circle r="42" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 4" className="animate-spin" />
                )}

                {/* Node Background Card Box (HTML over SVG via foreignObject) */}
                <foreignObject x="-95" y="-36" width="190" height="72">
                  <div
                    className={`p-2.5 rounded-xl border backdrop-blur-md transition-all flex flex-col justify-between shadow-lg ${
                      isHovered
                        ? 'bg-slate-900/95 border-indigo-400 scale-105 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                        : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          peripheral.category === 'printer' ? 'bg-indigo-500/20 text-indigo-400' :
                          peripheral.category === 'scanner' ? 'bg-emerald-500/20 text-emerald-400' :
                          peripheral.category === 'drawer' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {peripheral.category === 'printer' && <Printer className="w-3.5 h-3.5" />}
                          {peripheral.category === 'scanner' && <Scan className="w-3.5 h-3.5" />}
                          {peripheral.category === 'drawer' && <Banknote className="w-3.5 h-3.5" />}
                          {peripheral.category === 'edc' && <CreditCard className="w-3.5 h-3.5" />}
                        </span>
                        <div className="font-bold text-xs text-white truncate max-w-[100px]" title={peripheral.name}>
                          {peripheral.name.split(' ')[0]} {peripheral.name.split(' ')[1] || ''}
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${badgeColor}`}>
                        {peripheral.connectivity.interface === 'Bluetooth_LE' ? 'BLE' : peripheral.connectivity.interface === 'RJ12_Drawer_Kick' ? 'RJ12' : peripheral.connectivity.interface}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {peripheral.connectivity.latencyMs}ms
                      </span>
                      <span className="text-slate-400">SN: {peripheral.serialNumber.slice(0, 8)}</span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Legend Overlay at Bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card border border-border text-[11px] font-mono text-text backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: primaryColor }} /> USB Direct Bus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: secondaryColor }} /> Bluetooth LE (Wireless)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-500 rounded-full inline-block" /> RJ12 Solenoid Kick
            </span>
          </div>
          <div className="text-muted-foreground">
            แสดงเส้นทางเชื่อมต่ออุปกรณ์จำนวน {positionedPeripherals.length} รายการ
          </div>
        </div>
      </div>
    </div>
  );
};
