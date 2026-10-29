import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Cpu, ArrowLeft, Save, ShieldCheck, MapPin, Plus, Trash2 } from 'lucide-react';

interface SpecItem {
    key: string;
    label: string;
    value: string;
}

export default function MachineCreate() {
    const { data, setData, post, processing, errors } = useForm({
        machine_name: '',
        category: '',
        machine_type: '',
        sub_type: '',
        brand: '',
        model: '',
        serial_number: '',
        manufacturing_year: '',
        location: '',
        department: '',
        area: '',
        pic_department: '',
        status: 'RUNNING',
        commission_date: '',
        specifications: [] as SpecItem[],
    });

    const addField = () => {
        setData('specifications', [
            ...data.specifications,
            { key: '', label: '', value: '' }
        ]);
    };

    const removeField = (index: number) => {
        const updated = data.specifications.filter((_, i) => i !== index);
        setData('specifications', updated);
    };

    const handleSpecChange = (index: number, field: keyof SpecItem, value: string) => {
        const updated = [...data.specifications];
        updated[index][field] = value;
        
        if (field === 'label') {
            updated[index].key = value.toLowerCase().replace(/\s+/g, '_');
        }

        setData('specifications', updated);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/machines');
    };

    return (
        <AppLayout>
            <Head title="Tambah Mesin Baru" />

            {/* Header Utama */}
            <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pendaftaran Aset Mesin</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Daftarkan mesin atau unit produksi baru ke dalam sistem monitoring pabrik.
                    </p>
                </div>
                <Link
                    href="/machines"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs w-fit"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Mesin
                </Link>
            </div>

            {/* Form Utama */}
            <form onSubmit={submit} className="max-w-5xl mx-auto space-y-6 pb-20">
                
                {/* KARTU 1: INFORMASI DASAR */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
                        <Cpu className="w-4 h-4 text-emerald-600" /> Informasi Dasar & Klasifikasi
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Nama Mesin / Unit <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.machine_name}
                                onChange={e => setData('machine_name', e.target.value)}
                                placeholder="Contoh: CNC Milling Machine #02"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium bg-slate-50/50 transition-all"
                            />
                            {errors.machine_name && <span className="text-xs text-rose-600 font-bold mt-1 block">{errors.machine_name}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Kategori <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.category}
                                onChange={e => setData('category', e.target.value)}
                                placeholder="Contoh: Production / Utility"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium bg-slate-50/50 transition-all"
                            />
                            {errors.category && <span className="text-xs text-rose-600 font-bold mt-1 block">{errors.category}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Tipe Mesin <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.machine_type}
                                onChange={e => setData('machine_type', e.target.value)}
                                placeholder="Contoh: Heavy Duty / Conveyor"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium bg-slate-50/50 transition-all"
                            />
                            {errors.machine_type && <span className="text-xs text-rose-600 font-bold mt-1 block">{errors.machine_type}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Sub-Tipe (Opsional)
                            </label>
                            <input
                                type="text"
                                value={data.sub_type}
                                onChange={e => setData('sub_type', e.target.value)}
                                placeholder="Contoh: Axis-3 / Hydraulic"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-medium bg-slate-50/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Status Operasional Awal
                            </label>
                            <select
                                value={data.status}
                                onChange={e => setData('status', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-bold text-slate-800 bg-slate-50/50 transition-all"
                            >
                                <option value="RUNNING">RUNNING (Beroperasi)</option>
                                <option value="PLANNED_MAINTENANCE">PLANNED MAINTENANCE</option>
                                <option value="INACTIVE">INACTIVE (Non-Aktif)</option>
                                <option value="DOWN">DOWN</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* KARTU 2: SPESIFIKASI PABRIKAN & TAMBAHAN FIELD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Spesifikasi Mesin
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Brand / Merk</label>
                            <input
                                type="text"
                                value={data.brand}
                                onChange={e => setData('brand', e.target.value)}
                                placeholder="Contoh: DMG Mori"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Model</label>
                            <input
                                type="text"
                                value={data.model}
                                onChange={e => setData('model', e.target.value)}
                                placeholder="Contoh: NLX-2500"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nomor Seri (SN)</label>
                            <input
                                type="text"
                                value={data.serial_number}
                                onChange={e => setData('serial_number', e.target.value)}
                                placeholder="Contoh: SN-99823-X"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tahun Pembuatan</label>
                            <input
                                type="number"
                                value={data.manufacturing_year}
                                onChange={e => setData('manufacturing_year', e.target.value)}
                                placeholder="2024"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        {/* --- LIST FIELD TAMBAHAN YANG MUNCUL OTOMATIS --- */}
                        {data.specifications.map((spec, index) => (
                            <div key={index} className="relative  flex flex-col justify-between space-y-2">
                                <button
                                    type="button"
                                    onClick={() => removeField(index)}
                                    className="absolute top-1.2 right-1 text-rose-400 hover:text-rose-600 p-1 transition-colors"
                                    title="Hapus field"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <div>
                                    <input
                                        type="text"
                                        placeholder="Nama Field (Cth: Voltase)"
                                        value={spec.label}
                                        onChange={(e) => handleSpecChange(index, 'label', e.target.value)}
                                        className="w-full bg-transparent text-[11px] font-bold text-slate-600 uppercase outline-none border-b border-dashed border-slate-300 pb-1 pr-6"
                                        required
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Nilai (Cth: 380V)"
                                        value={spec.value}
                                        onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-600 font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- TOMBOL TAMBAHKAN FIELD SPESIFIKASI --- */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={addField}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Tambahkan field spesifikasi
                        </button>
                    </div>
                </div>

                {/* KARTU 3: LOKASI & PENANGGUNG JAWAB */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
                        <MapPin className="w-4 h-4 text-emerald-600" /> Penempatan & Departemen
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Lokasi Fisik <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.location}
                                onChange={e => setData('location', e.target.value)}
                                placeholder="Contoh: Plant 1 - Line Produksi B"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                            {errors.location && <span className="text-xs text-rose-600 font-bold mt-1 block">{errors.location}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Departemen</label>
                            <input
                                type="text"
                                value={data.department}
                                onChange={e => setData('department', e.target.value)}
                                placeholder="Contoh: Machining Dept"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Area / Zona</label>
                            <input
                                type="text"
                                value={data.area}
                                onChange={e => setData('area', e.target.value)}
                                placeholder="Contoh: Zona Timur"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">PIC Departemen</label>
                            <input
                                type="text"
                                value={data.pic_department}
                                onChange={e => setData('pic_department', e.target.value)}
                                placeholder="Contoh: Budi Santoso"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tanggal Komisioning</label>
                            <input
                                type="date"
                                value={data.commission_date}
                                onChange={e => setData('commission_date', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* TOMBOL AKSI SUBMIT */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Link
                        href="/machines"
                        className="px-6 py-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-white transition-all shadow-xs"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-7 py-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-700 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {processing ? 'Menyimpan...' : 'Simpan Data Mesin'}
                    </button>
                </div>

            </form>
        </AppLayout>
    );
}