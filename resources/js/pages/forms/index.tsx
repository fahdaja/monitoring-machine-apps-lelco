import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface Machine {
    id: number;
    machine_name?: string;
    machine_type: string;
}

interface FormItem {
    id: number;
    form_code: string;
    form_title: string;
    form_description?: string;
    machine: Machine;
    frequency_type: string;
    responder?: string; // <-- Tambahan kolom responden
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
}

interface Props {
    forms: FormItem[];
    machines: Machine[];
}

interface User {
    id: number;
    full_name: string;
    role: string;
}

interface PageProps {
    auth: {
        user: User;
    };
    [key: string]: any;
}

export default function FormIndex({ forms, machines }: Props) {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    // Helper format tanggal
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout>
            <Head title="Manajemen Form Inspeksi" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Manajemen Template Form</h1>
                        <p className="text-xs text-slate-500 mt-1">Buat form pengecekan yang terikat dengan mesin spesifik.</p>
                    </div>
                    {isAdmin && (
                        <Link
                            href="/forms/create"
                            className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
                        >
                            + Buat Form Baru
                        </Link>
                    )}
                </div>

                {/* Tabel Daftar Form */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-4 font-extrabold">Judul Form</th>
                                <th className="p-4 font-extrabold">Mesin Terikat</th>
                                <th className="p-4 font-extrabold">Responden</th> {/* <-- Kolom Responden Ditambahkan */}
                                <th className="p-4 text-center font-extrabold">Frekuensi</th>
                                <th className="p-4 text-center font-extrabold">Tanggal Dibuat</th>
                                <th className="p-4 text-center font-extrabold">Tanggal Diupdate</th>
                                <th className="p-4 text-center font-extrabold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {forms.length > 0 ? (
                                forms.map((f) => (
                                    <tr key={f.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{f.form_title}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{f.form_code}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">
                                                {f.machine?.machine_type || 'Mesin Umum'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">
                                            <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg">
                                                {f.responder || 'Teknisi / Operator'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-semibold text-slate-700">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                                                {f.frequency_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(f.created_at)}
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(f.updated_at)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                href={`/forms/${f.id}/builder`}
                                                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors inline-block"
                                            >
                                                Atur Pertanyaan
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">Belum ada template form yang tersedia.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}