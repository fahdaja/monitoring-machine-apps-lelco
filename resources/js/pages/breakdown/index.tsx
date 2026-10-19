import React, { useState, FormEvent } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '../../layouts/app-layout';


export interface BreakdownTicket {
  id: number;
  ticketId: string;
  machineId: string;
  machineName: string;
  location: string;
  problem: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'UNDER_REPAIR' | 'WAITING_SPAREPART' | 'WAITING_VENDOR' | 'READY_FOR_CLOSING' | 'CLOSED';
  pipelineStage: 'REPORT' | 'REPAIR' | 'WAITING' | 'CLOSING' | 'VERIFICATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentLevel?: string;
  reportedAt: string;
  breakdownMinutes: number;
}

interface BreakdownIndexProps {
  breakdowns?: BreakdownTicket[];
}

interface StageFilter {
  key: BreakdownTicket['pipelineStage'];
  label: string;
}

const BREAKDOWN_STAGES: StageFilter[] = [
  { key: 'REPORT', label: '1. Report' },
  { key: 'REPAIR', label: '2. Repair' },
  { key: 'WAITING', label: '3. Waiting' },
  { key: 'CLOSING', label: '4. Closing' },
  { key: 'VERIFICATION', label: '5. Verification' },
];

export default function BreakdownIndex({ breakdowns = [] }: BreakdownIndexProps) {
  const [selectedStages, setSelectedStages] = useState<BreakdownTicket['pipelineStage'][]>([]);
  const [activeCloseTicket, setActiveCloseTicket] = useState<BreakdownTicket | null>(null);

  // Strongly-typed Form State untuk Inertia
  const { data, setData, post, processing, errors, reset } = useForm<{
    root_cause: string;
    corrective_action: string;
  }>({
    root_cause: '',
    corrective_action: '',
  });

  const toggleStageFilter = (stageKey: BreakdownTicket['pipelineStage']) => {
    if (selectedStages.includes(stageKey)) {
      setSelectedStages(selectedStages.filter((s) => s !== stageKey));
    } else {
      setSelectedStages([...selectedStages, stageKey]);
    }
  };

  const clearFilters = () => {
    setSelectedStages([]);
  };

  const visibleStages = selectedStages.length > 0
    ? BREAKDOWN_STAGES.filter((s) => selectedStages.includes(s.key))
    : BREAKDOWN_STAGES;

  const handleCloseSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeCloseTicket) return;

    post(`/breakdowns/${activeCloseTicket.ticketId}/close`, {
      onSuccess: () => {
        setActiveCloseTicket(null);
        reset();
      },
    });
  };

  const formatDowntime = (minutes: number): string => {
    const m = Number(minutes || 0);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}j ${r}m`;
  };

  const getBadgeClass = (status: BreakdownTicket['status']): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
      case 'UNDER_REPAIR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WAITING_SPAREPART':
      case 'WAITING_VENDOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'READY_FOR_CLOSING':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'CLOSED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <AppLayout>
      <Head title="Machine Breakdown Pipeline" />

      {/* Header Halaman */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Machine Breakdown</h1>
        <p className="text-sm text-slate-500 mt-1">
          Corrective maintenance pipeline. Durasi breakdown dihitung sejak laporan Operator sampai mesin diverifikasi RUNNING kembali.
        </p>
      </div>

      {/* Filter Pipeline Multi-Select */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">FILTER PIPELINE</span>
            <h2 className="text-sm font-extrabold text-slate-900 mt-0.5">Pilih satu atau beberapa tahap</h2>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
              selectedStages.length === 0
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tampilkan Semua
          </button>
        </div>

        {/* Baris Tombol Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BREAKDOWN_STAGES.map((stg) => {
            const count = breakdowns.filter((b) => (b.pipelineStage || 'REPORT') === stg.key).length;
            const isActive = selectedStages.includes(stg.key);

            return (
              <button
                key={stg.key}
                type="button"
                onClick={() => toggleStageFilter(stg.key)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{stg.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban Pipeline Board - gap-6 untuk memberi jarak antar kolom stage */}
      <div className={`flex gap-6 overflow-x-auto pb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${visibleStages.length}`}>
        {visibleStages.map((stage) => {
          const items = breakdowns.filter((b) => (b.pipelineStage || 'REPORT') === stage.key);

          return (
            <div key={stage.key} className="w-[300px] shrink-0 bg-slate-100/80 border border-slate-200 rounded-2xl p-3.5 flex flex-col shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3 px-1">
                <div>
                  <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 block">PIPELINE</span>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">{stage.label}</h3>
                </div>
                <span className="bg-slate-900 text-white text-xs font-black px-2.5 py-1 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3.5 flex-1">
                {items.length > 0 ? (
                  items.map((b) => (
                    <article key={b.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-extrabold font-mono text-slate-500 block">
                            {b.ticketId} &bull; {b.currentLevel || 'GENERAL'}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug mt-0.5">{b.machineName}</h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{b.machineId} &bull; {b.location}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(b.status)}`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-2.5 p-2 bg-slate-50 rounded-lg text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-400 block">Reported</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{b.reportedAt || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Downtime</span>
                          <span className="font-bold text-slate-900 block mt-0.5">{formatDowntime(b.breakdownMinutes)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{b.problem}</p>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => router.get(`/machines/${b.machineId}`)}
                          className="flex-1 py-1.5 px-2 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors"
                        >
                          Lihat Mesin
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCloseTicket(b)}
                          className="flex-1 py-1.5 px-2 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-center transition-colors"
                        >
                          Close Ticket
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white/50">
                    Tidak ada case pada tahap ini.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Close Breakdown Ticket */}
      {activeCloseTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Close Ticket Breakdown</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{activeCloseTicket.ticketId} &bull; {activeCloseTicket.machineName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCloseTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Root Cause (Akar Penyebab) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={data.root_cause}
                  onChange={(e) => setData('root_cause', e.target.value)}
                  placeholder="Jelaskan penyebab utama kerusakan mesin..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  required
                />
                {errors.root_cause && <p className="text-xs text-rose-600 mt-1">{errors.root_cause}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corrective Action (Tindakan Perbaikan) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={data.corrective_action}
                  onChange={(e) => setData('corrective_action', e.target.value)}
                  placeholder="Jelaskan perbaikan atau pergantian sparepart yang telah dilakukan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  required
                />
                {errors.corrective_action && <p className="text-xs text-rose-600 mt-1">{errors.corrective_action}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCloseTicket(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {processing ? 'Menyimpan...' : 'Simpan & Close Breakdown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}