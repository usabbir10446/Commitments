import React, { useState, useEffect, useRef } from 'react';
import {
  ReportSettings,
  DEFAULT_REPORT_SETTINGS,
  SignatureMode,
  SignatureFontStyle
} from '../types';
import { compressSignatureImage } from '../utils/image';
import { formatBanglaDate, formatFriendlyDate } from '../utils/time';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  PenTool,
  Upload,
  Type,
  FileText,
  Eraser,
  Trash2,
  Lock,
  Loader2,
  Eye
} from 'lucide-react';

interface SettingsTabProps {
  settings: ReportSettings;
  onSave: (newSettings: ReportSettings) => Promise<{ success: boolean; syncedToCloud: boolean }>;
  isAdmin: boolean;
}

const HEADING_PRESETS = [
  'CMT of Respected Comdt',
  'CMT of Respected Acting Comdt',
  'CMT of Acting Commandant',
  'Daily Commitment Schedule'
];

const PEN_COLORS = [
  { label: 'Obsidian', value: '#0f172a', dotClass: 'bg-slate-900' },
  { label: 'Navy', value: '#1e3a8a', dotClass: 'bg-blue-900' },
  { label: 'Indigo', value: '#4f46e5', dotClass: 'bg-indigo-600' }
];

const TYPED_STYLES: { id: SignatureFontStyle; label: string; className: string }[] = [
  { id: 'dancing', label: 'Executive Script', className: "font-['Dancing_Script',cursive] text-4xl" },
  { id: 'great-vibes', label: 'Formal Calligraphy', className: "font-['Great_Vibes',cursive] text-4xl" },
  { id: 'serif-italic', label: 'Classic Italic', className: 'font-serif italic font-bold text-3xl' }
];

export const getTypedSignatureClass = (style?: SignatureFontStyle): string => {
  switch (style) {
    case 'great-vibes':
      return "font-['Great_Vibes',cursive] text-5xl text-slate-900";
    case 'serif-italic':
      return 'font-serif italic font-bold text-4xl text-slate-900';
    case 'dancing':
    default:
      return "font-['Dancing_Script',cursive] text-5xl text-slate-900";
  }
};

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSave, isAdmin }) => {
  const [draft, setDraft] = useState<ReportSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  // Populate canvas when entering 'draw' mode if an image already exists
  useEffect(() => {
    if (draft.signatureMode !== 'draw' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (draft.signatureImageData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = draft.signatureImageData;
    }
  }, [draft.signatureMode]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAdmin) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCanvasCoords(e);
    lastPointRef.current = point;
    setIsDrawing(true);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = penColor;
      ctx.arc(point.x, point.y, penWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isAdmin || !canvasRef.current || !lastPointRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const current = getCanvasCoords(e);
    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    lastPointRef.current = current;
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setDraft(prev => ({ ...prev, signatureImageData: dataUrl }));
    }
  };

  const clearCanvas = () => {
    if (!isAdmin) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDraft(prev => ({ ...prev, signatureImageData: '' }));
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressSignatureImage(reader.result as string, 600, 220);
        setDraft(prev => ({
          ...prev,
          signatureMode: 'upload',
          signatureImageData: compressed
        }));
      } catch (err) {
        console.error('Failed to process signature image:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isSaving) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const cleanHeading = draft.commitmentHeading.trim() || DEFAULT_REPORT_SETTINGS.commitmentHeading;
      const result = await onSave({
        ...draft,
        commitmentHeading: cleanHeading
      });
      if (result.success) {
        setSaveMessage(
          result.syncedToCloud
            ? 'Settings saved & synced across all displays.'
            : 'Settings saved on this device.'
        );
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!isAdmin) return;
    setDraft({ ...DEFAULT_REPORT_SETTINGS });
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setSaveMessage(null);
  };

  const today = new Date();
  const modeOptions: { id: SignatureMode; label: string; icon: React.ReactNode }[] = [
    { id: 'none', label: 'Text Only', icon: <FileText size={16} /> },
    { id: 'draw', label: 'Draw Sign', icon: <PenTool size={16} /> },
    { id: 'upload', label: 'Upload PNG', icon: <Upload size={16} /> },
    { id: 'typed', label: 'Typed Script', icon: <Type size={16} /> }
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-1 lg:pr-4">
      <form onSubmit={handleSave} className="max-w-5xl mx-auto space-y-6 lg:space-y-8 pb-20 animate-in fade-in duration-300">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-indigo-50 text-indigo-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6 lg:w-7 lg:h-7" />
            </div>
            <div>
              <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                Report &amp; Signature Settings
              </h2>
              <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-[0.25em]">
                Customize Commitment Heading &amp; Digital Sign-Off
              </p>
            </div>
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
              <Lock size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">View Only Mode</span>
            </div>
          )}
        </div>

        {/* SECTION 1: COMMITMENT HEADING */}
        <section className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-wider">
                Commitment Heading
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Displayed at the top of generated CMT reports (e.g., Commandant or Acting Commandant)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Report Title / Heading Text
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={draft.commitmentHeading}
              onChange={(e) => setDraft(prev => ({ ...prev, commitmentHeading: e.target.value }))}
              placeholder="e.g. CMT of Respected Acting Comdt"
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-4 outline-none font-black text-base lg:text-xl text-slate-900 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {HEADING_PRESETS.map((preset) => {
                const isSelected = draft.commitmentHeading.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setDraft(prev => ({ ...prev, commitmentHeading: preset }))}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                    } disabled:opacity-60`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2: DIGITAL SIGNATURE CUSTOMIZATION */}
        <section className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-wider">
                Digital Signature
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Customize signatory details and add a handwritten, uploaded, or script digital signature
              </p>
            </div>

            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => setDraft(prev => ({ ...prev, signatureEnabled: !prev.signatureEnabled }))}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all shrink-0 ${
                draft.signatureEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              } disabled:opacity-60`}
            >
              {draft.signatureEnabled ? 'Signature Enabled' : 'Signature Hidden'}
            </button>
          </div>

          {draft.signatureEnabled && (
            <div className="space-y-6">
              {/* Signatory Text Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Closing Greeting
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={draft.signatureGreeting}
                    onChange={(e) => setDraft(prev => ({ ...prev, signatureGreeting: e.target.value }))}
                    placeholder="e.g. Kind Regards,"
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3.5 outline-none font-bold text-sm lg:text-base text-slate-900 transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Signatory Name / Rank
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={draft.signatureName}
                    onChange={(e) => setDraft(prev => ({ ...prev, signatureName: e.target.value }))}
                    placeholder="e.g. Capt Usabbir"
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3.5 outline-none font-black text-sm lg:text-base text-slate-900 transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Appointment / Designation
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={draft.signatureDesignation}
                    onChange={(e) => setDraft(prev => ({ ...prev, signatureDesignation: e.target.value }))}
                    placeholder="e.g. GSO-3 (Coord)"
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3.5 outline-none font-bold text-sm lg:text-base text-indigo-600 transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Unit / Organization
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={draft.signatureOrganization}
                    onChange={(e) => setDraft(prev => ({ ...prev, signatureOrganization: e.target.value }))}
                    placeholder="e.g. BIPSOT"
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-4 py-3.5 outline-none font-black text-sm lg:text-base text-slate-900 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Digital Signature Graphic Mode */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Digital Signature Mark Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {modeOptions.map((opt) => {
                    const active = draft.signatureMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setDraft(prev => ({ ...prev, signatureMode: opt.id }))}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                            : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200'
                        } disabled:opacity-60`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Draw Pad */}
              {draft.signatureMode === 'draw' && (
                <div className="bg-slate-50 rounded-3xl p-4 lg:p-6 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ink</span>
                      <div className="flex items-center gap-2">
                        {PEN_COLORS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => setPenColor(c.value)}
                            title={c.label}
                            className={`w-7 h-7 rounded-xl ${c.dotClass} border-2 transition-all ${
                              penColor === c.value ? 'border-indigo-500 scale-110 ring-2 ring-indigo-200' : 'border-white'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Width</span>
                      <div className="flex items-center gap-1.5">
                        {[2, 3, 5].map(w => (
                          <button
                            key={w}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => setPenWidth(w)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                              penWidth === w
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200'
                            }`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={clearCanvas}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                      <Eraser size={14} />
                      <span>Clear Pad</span>
                    </button>
                  </div>

                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="w-full h-40 lg:h-44 bg-white rounded-2xl border-2 border-dashed border-slate-300 cursor-crosshair touch-none shadow-inner"
                    />
                    {!draft.signatureImageData && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                          Sign inside the box
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Signature Image */}
              {draft.signatureMode === 'upload' && (
                <div className="bg-slate-50 rounded-3xl p-5 lg:p-6 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <label className={`flex-1 w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isAdmin ? 'cursor-pointer hover:border-indigo-400' : 'opacity-60'}`}>
                      {isUploading ? (
                        <Loader2 className="animate-spin text-indigo-600" size={28} />
                      ) : draft.signatureImageData ? (
                        <img
                          src={draft.signatureImageData}
                          alt="Uploaded signature"
                          className="max-h-28 max-w-[90%] object-contain"
                        />
                      ) : (
                        <>
                          <Upload className="text-slate-400" size={28} />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Upload Signature PNG / JPG
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Transparent PNG recommended
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!isAdmin || isUploading}
                        onChange={handleUploadSignature}
                        className="hidden"
                      />
                    </label>

                    {draft.signatureImageData && isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, signatureImageData: '' }))}
                        className="px-4 py-3 bg-white text-rose-600 border border-rose-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Typed Script Signature */}
              {draft.signatureMode === 'typed' && (
                <div className="bg-slate-50 rounded-3xl p-5 lg:p-6 border border-slate-200 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Select Handwritten Font Style
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TYPED_STYLES.map((styleOpt) => {
                      const active = draft.signatureFontStyle === styleOpt.id;
                      return (
                        <button
                          key={styleOpt.id}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => setDraft(prev => ({ ...prev, signatureFontStyle: styleOpt.id }))}
                          className={`p-4 rounded-2xl border-2 text-center bg-white transition-all ${
                            active
                              ? 'border-indigo-600 ring-2 ring-indigo-100'
                              : 'border-slate-200 hover:border-indigo-200'
                          } disabled:opacity-60`}
                        >
                          <div className={`${styleOpt.className} text-slate-900 truncate py-1`}>
                            {draft.signatureName || 'Signature'}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mt-1">
                            {styleOpt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 3: LIVE REPORT PREVIEW */}
        <section className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-slate-400">
            <Eye size={16} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em]">
              Live Report Header &amp; Signature Preview
            </h3>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 lg:p-10 space-y-8">
            {/* Preview Header */}
            <div className="text-center pb-6 border-b-4 border-slate-900">
              <h4 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-2 break-words">
                {draft.commitmentHeading || DEFAULT_REPORT_SETTINGS.commitmentHeading}
              </h4>
              <p className="text-xs sm:text-base font-black text-indigo-600 uppercase italic">
                {formatBanglaDate(today)}
              </p>
              <p className="text-sm sm:text-lg font-black text-slate-900 uppercase">
                {formatFriendlyDate(today)}
              </p>
            </div>

            {/* Preview Footer & Signature */}
            <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.35em]">
                  System Verified Report
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                  Daily Cmt Intelligence • Security Protocol V2.1
                </p>
              </div>

              {draft.signatureEnabled ? (
                <div className="text-right self-end">
                  {draft.signatureGreeting && (
                    <p className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                      {draft.signatureGreeting}
                    </p>
                  )}

                  {(draft.signatureMode === 'draw' || draft.signatureMode === 'upload') && draft.signatureImageData && (
                    <div className="my-2 flex justify-end">
                      <img
                        src={draft.signatureImageData}
                        alt="Digital signature preview"
                        className="h-14 sm:h-16 max-w-[220px] object-contain"
                      />
                    </div>
                  )}

                  {draft.signatureMode === 'typed' && draft.signatureName && (
                    <div className="my-1 flex justify-end">
                      <span className={`${getTypedSignatureClass(draft.signatureFontStyle)} !text-3xl sm:!text-4xl`}>
                        {draft.signatureName}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col items-end">
                    {draft.signatureName && (
                      <p className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tighter">
                        {draft.signatureName}
                      </p>
                    )}
                    {draft.signatureDesignation && (
                      <p className="text-xs sm:text-sm font-black text-indigo-600 uppercase italic">
                        {draft.signatureDesignation}
                      </p>
                    )}
                    {draft.signatureOrganization && (
                      <p className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-widest mt-0.5">
                        {draft.signatureOrganization}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 self-end">
                  Signature Omitted
                </span>
              )}
            </div>
          </div>
        </section>

        {/* SAVE BAR */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              <span>Reset Defaults</span>
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
              {saveMessage && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl animate-in fade-in">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold">{saveMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SettingsTab;
