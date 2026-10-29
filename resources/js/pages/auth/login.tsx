import React, { useState, FormEvent, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';

interface User {
    id: number;
    full_name: string;
    role: {
        id: number;
        name: string;
    };
    department: {
        id: number;
        name: string;
    };
}

interface LoginProps {
    users?: User[];
    companyName?: string;
    appName?: string;
    tagline?: string;
    logoUrl?: string;
}

export default function Login({
    users = [],
    companyName = 'Nama Perusahaan',
    appName = 'Machine Digitalization',
    tagline = 'Machine Digitalization System',
    logoUrl,
}: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    // Inertia Form State
    const { data, setData, post, processing, errors } = useForm({
        id: 0,
        full_name: '',
        role: '',
        password: '',
    });

    const userList: User[] = users
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title={`Login - ${appName}`} />

            {/* Container Layar Utama Auth */}
            <div className="fixed inset-0 z-50 grid place-items-center p-7 bg-gradient-to-br from-[#041326] via-[#071b33] to-[#0b2748] overflow-y-auto">

                {/* Background Ambient Orbs */}
                <div className="absolute rounded-full blur-xs pointer-events-none opacity-20 w-[420px] h-[420px] bg-[#4c88c9] -right-[140px] -top-[150px]" />
                <div className="absolute rounded-full blur-xs pointer-events-none w-[340px] h-[340px] bg-white -left-[170px] -bottom-[180px] opacity-[0.06]" />

                {/* Card Box Login */}
                <div className="relative w-full max-w-[480px] bg-white border border-white/65 rounded-[28px] p-8 sm:p-9 shadow-[0_35px_90px_rgba(0,0,0,0.3)] my-auto">

                    {/* Header Branding */}
                    <div className="text-center">
                        {/* Logo Stage */}
                        <div className="w-[min(238px,72vw)] h-[122px] mx-auto mb-[18px] px-5 py-3.5 border border-[#e5ebf2] rounded-[20px] bg-white shadow-[0_14px_32px_rgba(7,27,51,0.08)] overflow-hidden flex items-center justify-center">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo Perusahaan"
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                <div className="w-[82px] h-[82px] rounded-[20px] bg-gradient-to-br from-[#071b33] to-[#12385f] text-white font-black text-2xl tracking-wider flex items-center justify-center">
                                    MD
                                </div>
                            )}
                        </div>

                        {/* Typography Identitas */}
                        <h1 className="text-[23px] leading-tight font-black text-[#071b33] tracking-[-0.2px]">
                            {companyName}
                        </h1>
                        <div className="text-[15px] font-extrabold text-[#12385f] mt-2">
                            {appName}
                        </div>
                        <p className="text-[12px] text-[#6b7a90] mt-1">
                            {tagline}
                        </p>
                    </div>

                    {/* Form Login */}
                    <form onSubmit={handleSubmit} className="mt-7 grid gap-2">

                        {/* Field Select Identitas Petugas */}
                        <div>
                            <label htmlFor="username" className="block text-[12px] font-extrabold text-[#455a72] mb-1">
                                Identitas Petugas
                            </label>

                            {/* Wrap dengan kontainer relative */}
                            <div className="relative w-full">
                                <select
                                    id="username"
                                    value={data.id}
                                    onChange={(e) => {
                                        const selectedId = Number(e.target.value);
                                        const selectedUser = userList.find((u) => u.id === selectedId);
                                        setData({
                                            id: selectedId,
                                            full_name: selectedUser?.full_name ?? '',
                                            role: selectedUser?.role?.name ?? '',
                                        });
                                    }}
                                    className="w-full h-12 border border-[#dce4ee] rounded-xl pl-3 pr-10 bg-white text-[#10233d] text-sm outline-none focus:border-[#12385f] focus:ring-4 focus:ring-[#12385f]/10 transition-all cursor-pointer appearance-none"
                                    required
                                >
                                    <option value="">Pilih petugas...</option>
                                    {userList.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} &nbsp;-&nbsp; {u.role?.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Custom Panah Dropdown */}
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#53677c]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {errors.full_name && (
                                <p className="text-xs text-rose-600 mt-1 font-semibold">{errors.full_name}</p>
                            )}
                        </div>

                        {/* Field Password dengan Eye Toggle */}
                        <div className="mt-2">
                            <label htmlFor="password" className="block text-[12px] font-extrabold text-[#455a72] mb-1">
                                Password Internal <b className="text-rose-600">*</b>
                            </label>
                            <div className="relative w-full">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                    className="w-full h-12 border border-[#dce4ee] rounded-xl pl-3 pr-12 bg-white text-[#10233d] text-sm outline-none focus:border-[#12385f] focus:ring-4 focus:ring-[#12385f]/10 transition-all"
                                    required
                                />

                                {/* Tombol Toggle Eye */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#53677c] hover:bg-[#0b1f33]/10 focus:outline-none transition-colors "
                                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 6.2A9.9 9.9 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-2.3 3M6.6 6.7C3.6 8.6 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                                            <circle cx="12" cy="12" r="2.6" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-rose-600 mt-1 font-semibold">{errors.password}</p>
                            )}
                        </div>

                        {/* Tombol Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-[50px] mt-4 w-full bg-[#071b33] hover:bg-[#0b2748] active:bg-[#12385f] text-white font-extrabold text-sm rounded-xl transition-all shadow-md disabled:opacity-60 cursor-pointer"
                        >
                            {processing ? 'Memproses...' : 'Masuk ke Sistem'}
                        </button>

                        <p className="text-center text-[#8090a4] text-[11px] leading-relaxed mt-2">
                            Password internal wajib digunakan untuk login.
                        </p>
                    </form>

                </div>
            </div>
        </>
    );
}