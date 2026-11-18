import React, { useState } from 'react';
import { Plus, Search, Users, X } from 'lucide-react';

export interface PicCandidate {
    id: number;
    full_name: string;
    user_code: string;
    role: string;
    department?: string | null;
    can_access_inspection?: boolean;
}

interface MachinePicPickerProps {
    candidates: PicCandidate[];
    value: number[];
    onChange: (userIds: number[]) => void;
    error?: string;
}

/**
 * Pemilih PIC mesin (bisa lebih dari satu orang).
 * Daftar ini dipakai sistem sebagai gerbang siapa boleh mengerjakan task mesin.
 */
export default function MachinePicPicker({ candidates, value, onChange, error }: MachinePicPickerProps) {
    const [search, setSearch] = useState('');

    const selectedIds = value ?? [];
    const selected = candidates.filter(c => selectedIds.includes(c.id));

    const query = search.trim().toLowerCase();
    const available = candidates.filter(c => !selectedIds.includes(c.id)).filter(c => {
        if (query === '') return true;
        return `${c.full_name} ${c.user_code} ${c.role} ${c.department ?? ''}`.toLowerCase().includes(query);
    });

    const addPic = (id: number) => onChange([...selectedIds, id]);
    const removePic = (id: number) => onChange(selectedIds.filter(v => v !== id));

    // PIC yang id-nya tidak ada di kandidat (user nonaktif, atau role ADMIN yang
    // dulu sempat dipilih) tetap harus bisa dihapus, jadi digambar sebagai chip khusus.
    const missingIds = selectedIds.filter(id => !candidates.some(c => c.id === id));

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Users className="w-3.5 h-3.5" /> {selected.length} PIC dipilih
                </span>
                {missingIds.length > 0 && (
                    <span className="text-[10px] font-bold text-rose-600">
                        {missingIds.length} PIC lama tidak lagi jadi kandidat — hapus dulu sebelum menyimpan.
                    </span>
                )}
            </div>

            {/* Chip PIC yang sudah dipilih */}
            {selectedIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map(pic => (
                        <span
                            key={pic.id}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold"
                        >
                            {pic.full_name}
                            <span className="text-[9px] font-mono text-slate-400">{pic.role}</span>
                            <button
                                type="button"
                                onClick={() => removePic(pic.id)}
                                className="w-4 h-4 rounded-full hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                title={`Hapus ${pic.full_name} dari PIC`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {missingIds.map(id => (
                        <span
                            key={`missing-${id}`}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[11px] font-bold"
                        >
                            PIC lama (user #{id})
                            <button
                                type="button"
                                onClick={() => removePic(id)}
                                className="w-4 h-4 rounded-full hover:bg-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                                title={`Hapus user #${id} dari PIC`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Belum ada PIC. Task pada mesin ini masih bisa dikerjakan semua user —
                    atur PIC dulu untuk mengunci penanggung jawabnya.
                </p>
            )}

            {/* Cari lalu klik untuk menambah */}
            <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama / kode user / departemen..."
                    className="w-full pl-8 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-medium"
                />
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/60">
                {available.length > 0 ? (
                    available.map(pic => (
                        <div
                            key={pic.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white transition-colors"
                        >
                            <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 truncate">{pic.full_name}</span>
                                <span className="block text-[10px] text-slate-500 truncate">
                                    {pic.user_code} &bull; {pic.role}
                                    {pic.department ? ` \u00b7 ${pic.department}` : ''}
                                    {pic.can_access_inspection === false ? ' \u00b7 role ini belum punya akses form inspeksi' : ''}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => addPic(pic.id)}
                                className="shrink-0 w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                                title={`Tambah ${pic.full_name} sebagai PIC`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="px-3 py-4 text-[11px] text-slate-500 text-center">
                        {candidates.length === 0 ? 'Belum ada user non-admin yang aktif di sistem.' : 'Semua kandidat sudah dipilih atau tidak cocok dengan pencarian.'}
                    </p>
                )}
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
                Hanya user yang dipilih di atas yang bisa membuka, scan QR, dan submit task milik mesin ini.
                Role ADMIN tidak ikut terdaftar sebagai PIC, tapi tetap bisa membuka task untuk verifikasi
                tanpa mengambil alih penugasannya.
            </p>

            {error && <span className="text-xs text-rose-600 font-bold block">{error}</span>}
        </div>
    );
}
