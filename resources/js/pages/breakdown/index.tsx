import React, { useState, FormEvent } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '../../layouts/app-layout';

export interface BreakdownTicket {
  id: number;
  ticket_code: string;
  machine_id: number;
  machine_code: string;
  machine_name: string;
  location: string;
  problem: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'ACKNOWLEDGED' | 'UNDER_REPAIR' | 'WAITING_SPAREPART' | 'WAITING_VENDOR' | 'READY_FOR_CLOSING' | 'CLOSED';
  pipelineStage: 'REPORT' | 'REPAIR' | 'WAITING' | 'CLOSING' | 'VERIFICATION';
  source_type: 'AUTO_REPORT' | 'MANUAL_REPORT';
  reported_by_name?: string;  
  assigned_to_name?: string;  
  verified_by_name?: string;  
  root_cause?: string;
  corrective_action?: string;
  verification_notes?: string;
  reported_at: string;
  started_at?: string;
  closed_at?: string;         // <-- Pastikan ada
  verified_at?: string;       // <-- Pastikan ada
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

    post(`/breakdowns/${activeCloseTicket.ticket_code}/close`, {
      onSuccess: () => {
        setActiveCloseTicket(null);
        reset();
      },
    });
  };

  const handleAcknowledge = (ticketCode: string) => {
    router.post(`/breakdowns/${ticketCode}/acknowledge`, {}, {
      preserveScroll: true,
    });
  };

  const handleUpdateStatus = (ticketCode: string, newStatus: string) => {
    router.put(`/breakdowns/${ticketCode}/status`, { status: newStatus }, {
      preserveScroll: true,
    });
  };

  const formatDowntime = (minutes: number): string => {
    const m = Math.round(Number(minutes || 0));
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
      case 'ACKNOWLEDGED':
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

  const { auth } = usePage<PageProps>().props;
  const userRole = auth?.user?.role?.toUpperCase();
  const isAdmin = userRole === 'ADMIN';

  return (
    <AppLayout>
      <Head title="Machine Breakdown Pipeline" />

      {/* Header Halaman */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Breakdown Mesin</h1>
        <p className="text-sm text-slate-500 mt-1">
          Corrective maintenance pipeline. Durasi breakdown dihitung sejak laporan masuk sampai mesin diverifikasi RUNNING kembali.
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BREAKDOWN_STAGES.map((stg) => {
            const count = breakdowns.filter((b) => b.pipelineStage === stg.key).length;
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

      {/* Kanban Pipeline Board */}
      <div className="flex gap-6 overflow-x-auto pb-6">
        {visibleStages.map((stage) => {
          const items = breakdowns.filter((b) => b.pipelineStage === stage.key);

          return (
            <div key={stage.key} className="w-[340px] shrink-0 bg-slate-100/80 border border-slate-200 rounded-2xl p-3.5 flex flex-col shadow-xs">
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
                      {/* Header Tiket */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold font-mono text-slate-500">
                              {b.ticket_code}
                            </span>
                            {/* Badge Source Type */}
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
          b.source_type === 'AUTO_REPORT'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {b.source_type === 'AUTO_REPORT' ? '🤖 Auto Report' : '👤 Manual Report'}
        </span>
      </div>

                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug mt-1">{b.machine_name}</h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {b.machine_code} &bull; {b.location}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(b.status)}`}>
                          {b.status}
                        </span>
                      </div>

                      {/* Deskripsi Masalah */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2.5">
                        <strong className="text-slate-700">Problem:</strong> {b.problem}
                      </p>

                      {/* Informasi Personil & Waktu (Dibuat Dinamis Sesuai Data yang Tersedia) */}
                      <div className="mb-2.5 text-[11px] text-slate-500 space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        {/* Pelapor (Hanya untuk Manual Report) */}
                        {b.source_type === 'MANUAL_REPORT' && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pelapor:</span>
                            <strong className="text-slate-700">{b.reported_by_name || 'Operator'}</strong>
                          </div>
                        )}

                        {/* Teknisi yang Menangani */}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned To:</span>
                          <strong className="text-blue-600">{b.assigned_to_name || 'Belum ditugaskan'}</strong>
                        </div>

                        {/* Verifikator (Jika sudah masuk tahap Closing / Verified) */}
                        {b.verified_by_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Verified By:</span>
                            <strong className="text-emerald-700">{b.verified_by_name}</strong>
                          </div>
                        )}
                      </div>

                      {/* Metrik Waktu & Downtime */}
                      <div className="grid grid-cols-2 gap-2 my-2.5 p-2 bg-slate-50 rounded-lg text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-400 block">Reported At</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{b.reported_at || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Total Downtime</span>
                          <span className="font-bold text-slate-900 block mt-0.5">{formatDowntime(b.breakdownMinutes)}</span>
                        </div>
                        {b.started_at && (
                          <div>
                            <span className="text-[9px] text-slate-400 block">Started Repair</span>
                            <span className="font-semibold text-slate-700 block mt-0.5">{b.started_at || '-'}</span>
                          </div>
                        )}
                        {b.closed_at && (
                          <div>
                            <span className="text-[9px] text-slate-400 block">Closed At</span>
                            <span className="font-semibold text-slate-700 block mt-0.5">{b.closed_at || '-'}</span>
                          </div>
                        )}
                        {b.verified_at && (
                          <div>
                            <span className="text-[9px] text-slate-400 block">Verified At</span>
                            <span className="font-semibold text-slate-700 block mt-0.5">{b.verified_at || '-'}</span>
                          </div>
                        )}
                      </div>

                      {/* Root Cause & Corrective Action */}
                      {(b.root_cause || b.corrective_action) && (
                        <div className="mb-3 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[11px] space-y-1">
                          {b.root_cause && <p><strong className="text-emerald-800">Root Cause:</strong> {b.root_cause}</p>}
                          {b.corrective_action && <p><strong className="text-emerald-800">Action:</strong> {b.corrective_action}</p>}
                        </div>
                      )}

                      {/* Tombol Aksi Berdasarkan Tahap Pipeline */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {b.pipelineStage === 'REPORT' && b.status === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(b.ticket_code)}
                            className="w-full py-1.5 px-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors shadow-xs"
                          >
                            Terima & Mulai Repair
                          </button>
                        )}

                        {b.pipelineStage === 'REPAIR' && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(b.ticket_code, 'WAITING_SPAREPART')}
                              className="flex-1 py-1 px-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 text-center"
                            >
                              Tunggu Sparepart
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(b.ticket_code, 'WAITING_VENDOR')}
                              className="flex-1 py-1 px-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 text-center"
                            >
                              Tunggu Vendor
                            </button>
                          </div>
                        )}

                        {b.pipelineStage === 'CLOSING' && isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              router.put(`/breakdowns/${b.ticket_code}/verify-close`, {}, {
                                preserveScroll: true,
                              });
                            }}
                            className="w-full py-1.5 px-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-center transition-colors shadow-xs"
                          >
                            Verifikasi & Selesaikan (Closed)
                          </button>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.get(`/machines/${b.machine_id}`)}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors"
                          >
                            Lihat Mesin
                          </button>
                          {b.pipelineStage === 'WAITING' && (

                          <button
                            type="button"
                            onClick={() => setActiveCloseTicket(b)}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-center transition-colors"
                          >
                            Close Ticket
                          </button>
                          )}
                        </div>
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
                <p className="text-xs text-slate-500 font-mono mt-0.5">{activeCloseTicket.ticket_code} &bull; {activeCloseTicket.machine_name}</p>
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