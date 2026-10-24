import React, { useState } from 'react';
import {
  X,
  Usb,
  Bluetooth,
  Wifi,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Printer,
  Scan,
  Banknote,
  CreditCard,
  MapPin,
  ShieldCheck,
  Zap,
  Activity,
  Radio,
} from 'lucide-react';

export interface NewDeviceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded: (deviceInfo: {
    name: string;
    category: 'printer' | 'scanner' | 'drawer' | 'edc';
    interfaceType: string;
    port: string;
    locationTag: string;
  }) => void;
}

export const NewDeviceSetupModal: React.FC<NewDeviceSetupModalProps> = ({
  isOpen,
  onClose,
  onDeviceAdded,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedInterface, setSelectedInterface] = useState<'USB' | 'Bluetooth_LE' | 'Ethernet'>('USB');
  const [selectedCategory, setSelectedCategory] = useState<'printer' | 'scanner' | 'drawer' | 'edc'>('printer');
  
  // Physical checklist status
  const [checklist, setChecklist] = useState({
    powerPlugged: true,
    powerSwitchedOn: true,
    cableConnectedOrPairing: false,
    paperOrConsumablesReady: true,
  });

  // Probing state
  const [probing, setProbing] = useState<boolean>(false);
  const [probeProgress, setProbeProgress] = useState<number>(0);
  const [probeLogs, setProbeLogs] = useState<string[]>([]);
  const [discoveredInfo, setDiscoveredInfo] = useState<{
    name: string;
    serialNumber: string;
    firmware: string;
    vendorId: string;
    productId: string;
  } | null>(null);

  // Configuration
  const [locationTag, setLocationTag] = useState<string>('Counter 1');
  const [emulationMode, setEmulationMode] = useState<string>('ESC/POS Line Mode');
  const [testSignalPassed, setTestSignalPassed] = useState<boolean>(false);
  const [testSignalMessage, setTestSignalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartProbe = () => {
    setProbing(true);
    setProbeProgress(10);
    setProbeLogs(['[Antigravity Probe] เริ่มสแกนบัสสัญญาณฮาร์ดแวร์...']);
    setDiscoveredInfo(null);

    setTimeout(() => {
      setProbeProgress(40);
      setProbeLogs((prev) => [
        ...prev,
        selectedInterface === 'USB'
          ? '[USB Bus] ตรวจพบการจับมือระดับฟิสิคัลบน USB Port (VID_04B8 & PID_0202)'
          : selectedInterface === 'Bluetooth_LE'
          ? '[BLE 5.2] ตรวจพบแพ็กเกจ Advertisement สัญญาณ RSSI -42dBm'
          : '[Ethernet] ส่งสัญญาณ Ping ARP Request ไปยังสับเน็ต 192.168.1.x',
      ]);
    }, 800);

    setTimeout(() => {
      setProbeProgress(80);
      setProbeLogs((prev) => [
        ...prev,
        '[Hardware Identity] ได้รับรหัสตอบรับ SYN/ACK จากไมโครคอนโทรลเลอร์อุปกรณ์...',
      ]);
    }, 1600);

    setTimeout(() => {
      setProbeProgress(100);
      setProbing(false);

      let devName = 'EPSON TM-T82III Thermal Receipt Printer';
      if (selectedCategory === 'scanner') devName = 'Honeywell Voyager 1470g 2D Scanner';
      else if (selectedCategory === 'drawer') devName = 'APG Series 4000 Heavy-Duty Cash Drawer';
      else if (selectedCategory === 'edc') devName = 'Verifone P400 EDC Payment Terminal';

      const info = {
        name: devName,
        serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
        firmware: 'v2.10.0',
        vendorId: '04B8',
        productId: '0202',
      };

      setDiscoveredInfo(info);
      setProbeLogs((prev) => [
        ...prev,
        `[SUCCESS] ตรวจพบอุปกรณ์: ${info.name} (${info.serialNumber}) เรียบร้อยแล้ว!`,
      ]);
    }, 2400);
  };

  const handleRunTestSignal = () => {
    setTestSignalMessage('กำลังส่งสัญญาณทดสอบกระตุ้นการทำงาน...');
    setTimeout(() => {
      setTestSignalPassed(true);
      setTestSignalMessage(
        selectedCategory === 'printer'
          ? 'ส่งคำสั่งทดสอบการพิมพ์ ESC/POS สำเร็จ (Thermal Head Response 1.2ms)'
          : selectedCategory === 'scanner'
          ? 'ส่งสัญญาณเสียงทดสอบ Beep 2.4kHz สำเร็จ'
          : selectedCategory === 'drawer'
          ? 'ส่งสัญญาณทดสอบเปิดลิ้นชัก (Kick Pulse 24V) สำเร็จ'
          : 'ส่งสัญญาณ Ping EMV PromptPay Terminal สำเร็จ'
      );
    }, 1000);
  };

  const handleFinishSetup = () => {
    let portStr = 'USB002';
    if (selectedInterface === 'Bluetooth_LE') portStr = 'BLE RFCOMM';
    else if (selectedInterface === 'Ethernet') portStr = 'Ethernet 192.168.1.109';

    onDeviceAdded({
      name: discoveredInfo?.name || 'New Connected Hardware',
      category: selectedCategory,
      interfaceType: selectedInterface,
      port: portStr,
      locationTag,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-card-entrance">
      <div className="bg-card rounded-3xl border border-border border-crisp shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 border-b border-indigo-900/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              Antigravity AI™ New Hardware Setup Wizard
            </div>
            <h2 className="text-xl font-bold tracking-tight">คู่มือตั้งค่าและติดตั้งฮาร์ดแวร์ใหม่ (Step-by-Step)</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Steps Header */}
        <div className="px-6 py-3 bg-background border-b border-border border-crisp flex items-center justify-between text-xs font-mono">
          {[
            { id: 1, label: '1. อินเทอร์เฟซ' },
            { id: 2, label: '2. ติดตั้งสาย' },
            { id: 3, label: '3. สแกนสัญญาณ' },
            { id: 4, label: '4. ตั้งค่าจุดบริการ' },
            { id: 5, label: '5. เสร็จสิ้น' },
          ].map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 font-semibold ${
                step === s.id
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : step > s.id
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-text/40'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.id
                    ? 'bg-indigo-600 text-white'
                    : step > s.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-border text-text/60'
                }`}
              >
                {step > s.id ? '✓' : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* STEP 1: Select Interface & Category */}
          {step === 1 && (
            <div className="space-y-5 animate-card-entrance">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ขั้นตอนที่ 1: เลือกหมวดหมู่ฮาร์ดแวร์และรูปแบบการเชื่อมต่อ</h3>
                <p className="text-xs text-text/60 mt-1">
                  เลือกประเภทอุปกรณ์และพอร์ตที่ต้องการนำมาติดตั้งในระบบ POS
                </p>
              </div>

              {/* Hardware Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text/70 uppercase">หมวดหมู่อุปกรณ์ (Hardware Category):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'printer', name: 'เครื่องพิมพ์ใบเสร็จ', icon: Printer, desc: 'Thermal ESC/POS' },
                    { id: 'scanner', name: 'สแกนเนอร์บาร์โค้ด', icon: Scan, desc: '1D / 2D QR Code' },
                    { id: 'drawer', name: 'ลิ้นชักเก็บเงิน', icon: Banknote, desc: '24V Solenoid RJ12' },
                    { id: 'edc', name: 'เครื่องชำระ EDC', icon: CreditCard, desc: 'PromptPay & EMV' },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          selectedCategory === cat.id
                            ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'bg-background hover:bg-card border-border text-text/80'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-indigo-500" />
                        <div>
                          <div className="text-xs font-bold">{cat.name}</div>
                          <div className="text-[10px] text-text/50 font-mono mt-0.5">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interface Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text/70 uppercase">อินเทอร์เฟซการเชื่อมต่อ (Interface Type):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'USB',
                      title: 'USB Direct Bus',
                      icon: Usb,
                      desc: 'เสียบสาย USB ตรงเข้าเครื่อง POS (Plug & Play)',
                      color: 'text-indigo-500',
                    },
                    {
                      id: 'Bluetooth_LE',
                      title: 'Bluetooth LE 5.2',
                      icon: Bluetooth,
                      desc: 'เชื่อมต่อแบบไร้สาย (Wireless Pairing)',
                      color: 'text-cyan-500',
                    },
                    {
                      id: 'Ethernet',
                      title: 'Ethernet / LAN',
                      icon: Wifi,
                      desc: 'เชื่อมต่อผ่านสายแลน / สับเน็ตเครือข่าย',
                      color: 'text-emerald-500',
                    },
                  ].map((iface) => {
                    const Icon = iface.icon;
                    return (
                      <button
                        key={iface.id}
                        onClick={() => setSelectedInterface(iface.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          selectedInterface === iface.id
                            ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'bg-background hover:bg-card border-border text-text/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-5 h-5 ${iface.color}`} />
                          <span className="text-[10px] font-mono uppercase bg-background px-2 py-0.5 rounded border">
                            {iface.id}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold">{iface.title}</div>
                          <div className="text-[11px] text-text/60 mt-1">{iface.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Physical Checklist & Cables */}
          {step === 2 && (
            <div className="space-y-5 animate-card-entrance">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ขั้นตอนที่ 2: ตรวจสอบสายเชื่อมต่อและสถานะทางกายภาพ</h3>
                <p className="text-xs text-text/60 mt-1">
                  ทำตามรายการตรวจสอบเพื่อเตรียมความพร้อมอุปกรณ์ก่อนเริ่มส่งสัญญาณสแกนจับมือ
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-background border border-border border-crisp">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.powerPlugged}
                    onChange={(e) => setChecklist((p) => ({ ...p, powerPlugged: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="font-bold text-xs text-text">1. เสียบสายไฟเลี้ยง (Power Adapter) เข้ากับตัวอุปกรณ์</div>
                    <div className="text-[10px] text-text/60">ตรวจสอบว่าอแดปเตอร์จ่ายไฟเสถียร (ไฟ LED แสดงสถานะสว่าง)</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.powerSwitchedOn}
                    onChange={(e) => setChecklist((p) => ({ ...p, powerSwitchedOn: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="font-bold text-xs text-text">2. เปิดสวิตช์พลังงาน (Power Switch ON)</div>
                    <div className="text-[10px] text-text/60">เลื่อนสวิตช์ไปที่ตำแหน่ง ON ให้ไฟหน้าเครื่องสว่าง</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.cableConnectedOrPairing}
                    onChange={(e) => setChecklist((p) => ({ ...p, cableConnectedOrPairing: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="font-bold text-xs text-text">
                      {selectedInterface === 'USB'
                        ? '3. เสียบสาย USB เข้าพอร์ตของเครื่อง POS'
                        : selectedInterface === 'Bluetooth_LE'
                        ? '3. กดปุ่มจับคู่ (Pairing Button) ค้างไว้ 3 วินาทีจนไฟ BLE กะพริบ'
                        : '3. เสียบสายแลน RJ45 เข้าสวิตช์เครือข่าย/เราเตอร์'}
                    </div>
                    <div className="text-[10px] text-text/60">
                      {selectedInterface === 'USB'
                        ? 'ตรวจสอบให้แน่ใจว่าสาย USB แน่นหนา ไม่หลวม'
                        : 'อุปกรณ์จะปล่อยสัญญาณค้นหาสำหรับ Antigravity Engine'}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.paperOrConsumablesReady}
                    onChange={(e) => setChecklist((p) => ({ ...p, paperOrConsumablesReady: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="font-bold text-xs text-text">4. เตรียมความพร้อมกระดาษม้วน/วัสดุสิ้นเปลือง</div>
                    <div className="text-[10px] text-text/60">ใส่กระดาษใบเสร็จความร้อน 80mm ให้ถูกต้องและปิดฝาให้สนิท</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Auto Probe & Discovery */}
          {step === 3 && (
            <div className="space-y-5 animate-card-entrance">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ขั้นตอนที่ 3: สแกนสัญญาณและตรวจรับอุปกรณ์ (Signal Discovery)</h3>
                <p className="text-xs text-text/60 mt-1">
                  Antigravity AI Engine กำลังส่งสัญญาณทดสอบผ่านอินเทอร์เฟซ {selectedInterface}
                </p>
              </div>

              {!discoveredInfo && !probing && (
                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-3">
                  <Radio className="w-8 h-8 text-indigo-500 animate-pulse mx-auto" />
                  <div className="font-bold text-sm text-text">พร้อมเริ่มกระบวนการสแกนฮาร์ดแวร์</div>
                  <p className="text-xs text-text/70 max-w-md mx-auto">
                    กดปุ่มด้านล่างเพื่อให้ Antigravity AI ส่งสัญญาณทดสอบค้นหาอุปกรณ์พอร์ต {selectedInterface}
                  </p>
                  <button
                    onClick={handleStartProbe}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    เริ่มการสแกนค้นหา (Start Probe)
                  </button>
                </div>
              )}

              {probing && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-4 text-white">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2 font-bold text-indigo-400">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      กำลังส่งแพ็กเกจสัญญาณ SYN/ACK Probe...
                    </span>
                    <span>{probeProgress}%</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 transition-all duration-500"
                      style={{ width: `${probeProgress}%` }}
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 font-mono text-[11px] text-slate-300 space-y-1 max-h-32 overflow-y-auto">
                    {probeLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {discoveredInfo && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-4 animate-card-entrance">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    สแกนพบอุปกรณ์ฮาร์ดแวร์สำเร็จ! (Hardware Discovered)
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-xs">
                    <div className="font-bold text-sm text-text">{discoveredInfo.name}</div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-text/70">
                      <div>Serial Number: <strong className="text-text">{discoveredInfo.serialNumber}</strong></div>
                      <div>Firmware: <strong className="text-text">{discoveredInfo.firmware}</strong></div>
                      <div>Vendor ID: <strong className="text-text">{discoveredInfo.vendorId}</strong></div>
                      <div>Product ID: <strong className="text-text">{discoveredInfo.productId}</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Location Tag & Configuration */}
          {step === 4 && (
            <div className="space-y-5 animate-card-entrance">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ขั้นตอนที่ 4: ระบุสถานที่จัดวางและทดสอบไดรเวอร์โปรไฟล์</h3>
                <p className="text-xs text-text/60 mt-1">
                  กำหนดแท็กสถานที่หน้าร้าน (เช่น Counter 1, Kitchen) และส่งสัญญาณทดสอบขั้นสุดท้าย
                </p>
              </div>

              <div className="space-y-4 p-4 rounded-2xl bg-background border border-border border-crisp">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text/70 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    แท็กสถานที่จัดวาง (Physical Location Tag):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Counter 1', 'Kitchen', 'Bar', 'Checkout 2', 'Main POS'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setLocationTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          locationTag === tag
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-card border-border text-text/70 hover:text-text'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-text/70">ไดรเวอร์โปรไฟล์ (Driver Emulation):</label>
                  <select
                    value={emulationMode}
                    onChange={(e) => setEmulationMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs text-text font-mono focus:outline-none"
                  >
                    <option value="ESC/POS Line Mode">ESC/POS Line Mode (High-Speed Thermal)</option>
                    <option value="HID-POS Keyboard Wedge">HID-POS Keyboard Wedge (Zero packet loss)</option>
                    <option value="24V Solenoid Direct Pulse">24V Solenoid Direct Pulse (APG Standard)</option>
                    <option value="EMV Contactless TLS 1.3">EMV Contactless TLS 1.3 (PromptPay Active)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">ส่งสัญญาณทดสอบ (Test Signal Pulse):</span>
                    <button
                      onClick={handleRunTestSignal}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      ส่งสัญญาณทดสอบ
                    </button>
                  </div>

                  {testSignalMessage && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-mono ${
                        testSignalPassed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {testSignalMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Final Summary & Register */}
          {step === 5 && (
            <div className="space-y-5 animate-card-entrance">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ขั้นตอนที่ 5: สรุปข้อมูลและลงทะเบียนอุปกรณ์เข้าสู่ระบบ</h3>
                <p className="text-xs text-text/60 mt-1">
                  อุปกรณ์ได้รับการยืนยันไดรเวอร์และตรวจสอบความปลอดภัยจาก Antigravity AI พร้อมใช้งานทันที
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white border border-indigo-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm">Antigravity Hardware Verification Complete</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    WHQL Certified
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-base font-bold text-white">{discoveredInfo?.name || 'New Hardware'}</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                    <div>สถานที่ติดตั้ง: <strong className="text-indigo-300">{locationTag}</strong></div>
                    <div>อินเทอร์เฟซ: <strong className="text-cyan-300">{selectedInterface}</strong></div>
                    <div>ซีเรียลนัมเบอร์: <strong className="text-slate-100">{discoveredInfo?.serialNumber}</strong></div>
                    <div>ความเร็วการตอบสนอง: <strong className="text-emerald-400">1.2 ms</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-background border-t border-border border-crisp flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-text disabled:opacity-40 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ย้อนกลับ
          </button>

          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 3 && !discoveredInfo) {
                  handleStartProbe();
                } else {
                  setStep((s) => Math.min(5, s + 1));
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>ถัดไป</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishSetup}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              ลงทะเบียนและเสร็จสิ้น
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
