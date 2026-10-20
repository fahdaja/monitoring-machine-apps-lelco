import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface Machine {
    machine_id: string;
    machine_name: string;
    tonnage: string;
}

interface FormItem {
    form_id: string;
    form_title: string;
    description: string;
    machine: Machine;
    is_active: boolean;
}

interface Props {
    forms: FormItem[];
    machines: Machine[];
}

export default function FormIndex({ forms, machines }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        form_title: '',
        machine_id: '',
        description: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forms', {
            onSuccess: () => {
                reset();
                setIsModalOpen(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Manajemen Form Inspeksi" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Manajemen Template Form</h1>
                        <p className="text-xs text-slate-500 mt-1">Buat form pengecekan yang terikat dengan mesin spesifik.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
                    >
                        + Buat Form Baru
                    </button>
                </div>

                {/* Tabel Daftar Form */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                                <th className="p-4">Judul Form</th>
                                <th className="p-4">Mesin Terikat</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {forms.length > 0 ? (
                                forms.map((f) => (
                                    <tr key={f.form_id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-900">{f.form_title}</td>
                                        <td className="p-4 text-slate-600">
                                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">
                                                {f.machine?.machine_name} ({f.machine?.tonnage} Ton)
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Aktif
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={`/forms/${f.form_id}/builder`}
                                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800"
                                            >
                                                Atur Pertanyaan
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">Belum ada template form.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Buat Form */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                            <h3 className="text-base font-black text-slate-900">Buat Template Form Baru</h3>
                            <form onSubmit={submit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Judul Form</label>
                                    <input
                                        type="text"
                                        value={data.form_title}
                                        onChange={e => setData('form_title', e.target.value)}
                                        placeholder="Contoh: Checklist Harian Injeksi"
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    {errors.form_title && <span className="text-[10px] text-rose-600 font-bold">{errors.form_title}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Mesin</label>
                                    <select
                                        value={data.machine_id}
                                        onChange={e => setData('machine_id', e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                    >
                                        <option value="">-- Pilih Mesin Terkait --</option>
                                        {machines.map((m) => (
                                            <option key={m.machine_id} value={m.machine_id}>
                                                {m.machine_name} ({m.tonnage} Ton)
                                            </option>
                                        ))}
                                    </select>
                                    {errors.machine_id && <span className="text-[10px] text-rose-600 font-bold">{errors.machine_id}</span>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi (Opsional)</label>
                                    <textarea
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Keterangan tambahan..."
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border text-slate-600 hover:bg-slate-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Simpan Form
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}