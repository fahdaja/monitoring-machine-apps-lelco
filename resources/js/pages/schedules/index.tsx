import React, { useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Calendar,
    Clock,
    FileText,
    Settings,
    Trash2,
    RefreshCw,
    Power,
    Edit3,
    Zap,
    ArrowRight,
    Cpu,
    Users,
    Check,
    CheckSquare,
    Square,
    Search,
    AlertCircle,
} from 'lucide-react';

interface FormItem {
    id: number;
    form_title: string;
    form_code: string;
}

interface MachinePic {
    id: number;
    full_name: string;
    user_code?: string;
    role?: string;
    department?: string | null;
}

interface MachineOption {
    id: number;
    machine_code: string;
    machine_name: string;
    location: string;
    department?: string;
    pics: MachinePic[];
}

interface MachineAssignment {
    machine_id: number;
    machine_name?: string;
    machine_code?: string;
    location?: string;
    assigned_user_ids: number[];
    targeted_pics?: { id: number; full_name: string }[];
}

interface ScheduleItem {
    id: number;
    schedule_code: string;
    form: FormItem;
    machines: MachineAssignment[];
    frequency_type: string;
    selected_days?: string[];
    selected_dates?: number[];
    due_window_days?: number;
    is_active: boolean;
}

interface ConditionItem {
    id: number;
    condition_code: string;
    trigger_form?: { id: number; form_title: string; form_code: string } | null;
    trigger_section?: { id: number; section_order: number; section_title: string } | null;
    trigger_question?: { id: number; question_text: string; input_type?: string } | null;
    trigger_operator?: string;
    trigger_value?: string | null;
    trigger_rule_label?: string;
    trigger_option?: { id: number; option_text: string; is_normal?: boolean } | null;
    target_form?: { id: number; form_title: string; form_code: string } | null;
    due_window_days?: number;
    is_active: boolean;
}

interface ConditionOperatorOption {
    value: string;
    label: string;
    needs_option: boolean;
    needs_value: boolean;
    value_kind: 'option' | 'text' | 'number' | 'date' | 'time' | 'none';
}

interface QuestionItem {
    id: number;
    question_text: string;
    input_type: string;
    section_id?: number;
    section_order?: number;
    section_title?: string;
    operators?: ConditionOperatorOption[];
    options: { id: number; option_text: string; is_normal?: boolean }[];
}

interface Props {
    schedules: ScheduleItem[];
    forms: FormItem[];
    machines: MachineOption[];
    conditions: ConditionItem[];
}

const DAYS_OF_WEEK = [
    { value: '1', label: 'Senin' },
    { value: '2', label: 'Selasa' },
    { value: '3', label: 'Rabu' },
    { value: '4', label: 'Kamis' },
    { value: '5', label: 'Jumat' },
    { value: '6', label: 'Sabtu' },
    { value: '7', label: 'Minggu' },
];

export default function ScheduleIndex({ schedules = [], forms = [], machines = [], conditions = [] }: Props) {
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.user?.role?.toUpperCase() === 'ADMIN';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
    const [machineSearch, setMachineSearch] = useState('');

    // State form pengaturan jadwal
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        form_id: '',
        frequency_type: 'DAILY',
        due_window_days: '1',
        selected_days: [] as string[],
        selected_dates: [] as number[],
        machine_assignments: [] as { machine_id: number; assigned_user_ids: number[] }[],
    });

    // State kondisi trigger antar form inspeksi
    const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
    const [editingCondition, setEditingCondition] = useState<ConditionItem | null>(null);
    const [conditionQuestions, setConditionQuestions] = useState<QuestionItem[]>([]);
    const [selectedConditionSectionId, setSelectedConditionSectionId] = useState('');

    const {
        data: condData,
        setData: setCondData,
        post: postCondition,
        put: putCondition,
        processing: condProcessing,
        errors: condErrors,
        reset: resetCond,
        clearErrors: clearCondErrors,
    } = useForm({
        trigger_form_id: '',
        trigger_question_id: '',
        trigger_operator: 'option_selected',
        trigger_option_id: '',
        trigger_value: '',
        target_form_id: '',
        due_window_days: '1',
    });

    const conditionSections = Array.from(
        new Map(
            conditionQuestions
                .filter((q) => q.section_id)
                .map((q) => [
                    q.section_id!,
                    {
                        id: q.section_id!,
                        section_order: q.section_order ?? 0,
                        section_title: q.section_title ?? '',
                    },
                ])
        ).values()
    ).sort((a, b) => a.section_order - b.section_order);

    const filteredConditionQuestions = selectedConditionSectionId
        ? conditionQuestions.filter((q) => q.section_id?.toString() === selectedConditionSectionId)
        : [];

    const selectedConditionQuestion = conditionQuestions.find(
        (q) => q.id.toString() === condData.trigger_question_id
    );
    const availableOperators = selectedConditionQuestion?.operators || [];
    const selectedOperatorObj =
        availableOperators.find((op) => op.value === condData.trigger_operator) || availableOperators[0] || null;

    const loadConditionQuestions = (formId: string) => {
        setConditionQuestions([]);
        if (!formId) return;
        fetch(`/schedules/condition-questions/${formId}?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
            },
        })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setConditionQuestions(Array.isArray(data) ? data : []))
            .catch(() => setConditionQuestions([]));
    };

    const openCreateModal = () => {
        setEditingSchedule(null);
        reset();
        clearErrors();
        setData({
            form_id: '',
            frequency_type: 'DAILY',
            due_window_days: '1',
            selected_days: [],
            selected_dates: [],
            machine_assignments: [],
        });
        setMachineSearch('');
        setIsModalOpen(true);
    };

    const openEditModal = (sch: ScheduleItem) => {
        setEditingSchedule(sch);
        setData({
            form_id: sch.form?.id ? sch.form.id.toString() : '',
            frequency_type: sch.frequency_type,
            due_window_days: sch.due_window_days ? sch.due_window_days.toString() : '1',
            selected_days: sch.selected_days || [],
            selected_dates: sch.selected_dates || [],
            machine_assignments: (sch.machines || []).map((m) => ({
                machine_id: m.machine_id,
                assigned_user_ids: m.assigned_user_ids || [],
            })),
        });
        setMachineSearch('');
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
        reset();
        clearErrors();
    };

    // Toggle pemilihan mesin
    const toggleMachine = (machineId: number) => {
        const exists = data.machine_assignments.some((ma) => ma.machine_id === machineId);
        if (exists) {
            setData(
                'machine_assignments',
                data.machine_assignments.filter((ma) => ma.machine_id !== machineId)
            );
        } else {
            setData('machine_assignments', [
                ...data.machine_assignments,
                { machine_id: machineId, assigned_user_ids: [] },
            ]);
        }
    };

    // Toggle targeted user PIC untuk mesin tertentu
    const toggleMachinePic = (machineId: number, userId: number) => {
        const updated = data.machine_assignments.map((ma) => {
            if (ma.machine_id !== machineId) return ma;
            const currentUsers = ma.assigned_user_ids || [];
            const userExists = currentUsers.includes(userId);
            const nextUsers = userExists
                ? currentUsers.filter((id) => id !== userId)
                : [...currentUsers, userId];
            return {
                ...ma,
                assigned_user_ids: nextUsers,
            };
        });
        setData('machine_assignments', updated);
    };

    // Set semua PIC mesin menjadi targeted
    const selectAllPics = (machineId: number, picIds: number[]) => {
        const updated = data.machine_assignments.map((ma) => {
            if (ma.machine_id !== machineId) return ma;
            return {
                ...ma,
                assigned_user_ids: [...picIds],
            };
        });
        setData('machine_assignments', updated);
    };

    // Kosongkan target PIC (artinya semua PIC mesin otomatis diizinkan)
    const clearPics = (machineId: number) => {
        const updated = data.machine_assignments.map((ma) => {
            if (ma.machine_id !== machineId) return ma;
            return {
                ...ma,
                assigned_user_ids: [],
            };
        });
        setData('machine_assignments', updated);
    };

    // ===== Kondisi trigger (lvl 1 -> lvl 2) =====
    const openCreateConditionModal = () => {
        setEditingCondition(null);
        resetCond();
        setConditionQuestions([]);
        setSelectedConditionSectionId('');
        clearCondErrors();
        setIsConditionModalOpen(true);
    };

    const openEditConditionModal = (cond: ConditionItem) => {
        setEditingCondition(cond);
        setSelectedConditionSectionId(cond.trigger_section?.id?.toString() || '');
        const normalizedOp =
            cond.trigger_operator === 'file_uploaded'
                ? 'filled'
                : cond.trigger_operator === 'file_empty'
                ? 'empty'
                : cond.trigger_operator || 'option_selected';
        setCondData({
            trigger_form_id: cond.trigger_form?.id.toString() || '',
            trigger_question_id: cond.trigger_question?.id.toString() || '',
            trigger_operator: normalizedOp,
            trigger_option_id: cond.trigger_option?.id.toString() || '',
            trigger_value: cond.trigger_value || '',
            target_form_id: cond.target_form?.id.toString() || '',
            due_window_days: cond.due_window_days?.toString() || '1',
        });
        loadConditionQuestions(cond.trigger_form?.id.toString() || '');
        clearCondErrors();
        setIsConditionModalOpen(true);
    };

    const closeConditionModal = () => {
        setIsConditionModalOpen(false);
        setEditingCondition(null);
        resetCond();
        setConditionQuestions([]);
        setSelectedConditionSectionId('');
        clearCondErrors();
    };

    const submitCondition = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCondition) {
            putCondition(`/schedule-conditions/${editingCondition.id}`, {
                onSuccess: () => closeConditionModal(),
            });
        } else {
            postCondition('/schedule-conditions', {
                onSuccess: () => closeConditionModal(),
            });
        }
    };

    const toggleConditionStatus = (id: number) => {
        router.patch(`/schedule-conditions/${id}/toggle`, {}, { preserveScroll: true });
    };

    const deleteCondition = (id: number) => {
        if (
            confirm(
                'Apakah Anda yakin ingin menghapus kondisi trigger ini secara permanen? Task yang sudah terlanjur dibuat tidak akan terhapus.'
            )
        ) {
            router.delete(`/schedule-conditions/${id}`, { preserveScroll: true });
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.machine_assignments.length === 0) {
            alert('Pilih minimal satu mesin untuk jadwal ini!');
            return;
        }

        if (editingSchedule) {
            put(`/schedules/${editingSchedule.id}`, {
                onSuccess: () => closeModal(),
            });
        } else {
            post('/schedules', {
                onSuccess: () => closeModal(),
            });
        }
    };

    const toggleDay = (dayVal: string) => {
        const exists = data.selected_days.includes(dayVal);
        if (exists) {
            setData('selected_days', data.selected_days.filter((d) => d !== dayVal));
        } else {
            setData('selected_days', [...data.selected_days, dayVal]);
        }
    };

    const toggleDateNum = (dateNum: number) => {
        const exists = data.selected_dates.includes(dateNum);
        if (exists) {
            setData('selected_dates', data.selected_dates.filter((d) => d !== dateNum));
        } else {
            setData('selected_dates', [...data.selected_dates, dateNum].sort((a, b) => a - b));
        }
    };

    const isoDayOfWeek = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
    const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

    const nextWeekMonday = (): Date => {
        const today = new Date();
        const d = new Date(today);
        d.setDate(today.getDate() + (8 - isoDayOfWeek(today)));
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const weeklyPreview = (): string[] => {
        const base = nextWeekMonday();
        const out: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            if (data.selected_days.includes(String(isoDayOfWeek(d)))) {
                out.push(dateFmt.format(d));
            }
        }
        return out;
    };

    const nextMonthLastDay = (): number => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
    };

    const monthlyPreview = (): string[] => {
        const today = new Date();
        const lastDay = nextMonthLastDay();
        const out: string[] = [];
        for (let day = 1; day <= lastDay; day++) {
            const d = new Date(today.getFullYear(), today.getMonth() + 1, day);
            if (data.selected_dates.includes(d.getDate())) {
                out.push(dateFmt.format(d));
            }
        }
        return out;
    };

    const monthlySkipped = (): number[] => {
        const lastDay = nextMonthLastDay();
        return data.selected_dates.filter((x) => x > lastDay).sort((a, b) => a - b);
    };

    const toggleStatus = (id: number, currentStatus: boolean) => {
        router.patch(
            `/schedules/${id}/toggle`,
            {
                is_active: !currentStatus,
            },
            {
                preserveScroll: true,
            }
        );
    };

    const filteredMachines = machines.filter((m) => {
        if (!machineSearch.trim()) return true;
        const q = machineSearch.toLowerCase();
        return (
            m.machine_code.toLowerCase().includes(q) ||
            m.machine_name.toLowerCase().includes(q) ||
            (m.location && m.location.toLowerCase().includes(q)) ||
            (m.department && m.department.toLowerCase().includes(q))
        );
    });

    const allScheduledFormIds = new Set(
        schedules
            .map((s) => s.form?.id)
            .filter((id): id is number => typeof id === 'number')
    );

    const conditionTargetFormIds = new Set(
        conditions
            .map((c) => c.target_form?.id)
            .filter((id): id is number => typeof id === 'number')
    );

    const otherConditionTargetFormIds = new Set(
        conditions
            .filter((c) => !editingCondition || c.id !== editingCondition.id)
            .map((c) => c.target_form?.id)
            .filter((id): id is number => typeof id === 'number')
    );

    const scheduledFormIds = new Set(
        schedules
            .filter((s) => !editingSchedule || s.id !== editingSchedule.id)
            .map((s) => s.form?.id)
            .filter((id): id is number => typeof id === 'number')
    );

    const hasAvailableScheduleForm = forms.some(
        (f) => !scheduledFormIds.has(f.id) && !conditionTargetFormIds.has(f.id)
    );

    const isDuplicateConditionTarget = (targetFormId: number) => {
        if (!condData.trigger_form_id || !condData.trigger_question_id || !condData.trigger_operator) {
            return false;
        }
        if (selectedOperatorObj?.needs_option) {
            if (!condData.trigger_option_id) return false;
            return conditions.some(
                (c) =>
                    (!editingCondition || c.id !== editingCondition.id) &&
                    c.trigger_form?.id?.toString() === condData.trigger_form_id &&
                    c.trigger_question?.id?.toString() === condData.trigger_question_id &&
                    (c.trigger_operator || 'option_selected') === condData.trigger_operator &&
                    c.trigger_option?.id?.toString() === condData.trigger_option_id &&
                    c.target_form?.id === targetFormId
            );
        }
        if (selectedOperatorObj?.needs_value) {
            if (!condData.trigger_value.trim()) return false;
            return conditions.some(
                (c) =>
                    (!editingCondition || c.id !== editingCondition.id) &&
                    c.trigger_form?.id?.toString() === condData.trigger_form_id &&
                    c.trigger_question?.id?.toString() === condData.trigger_question_id &&
                    (c.trigger_operator || 'option_selected') === condData.trigger_operator &&
                    (c.trigger_value || '').trim() === condData.trigger_value.trim() &&
                    c.target_form?.id === targetFormId
            );
        }
        return conditions.some(
            (c) =>
                (!editingCondition || c.id !== editingCondition.id) &&
                c.trigger_form?.id?.toString() === condData.trigger_form_id &&
                c.trigger_question?.id?.toString() === condData.trigger_question_id &&
                (c.trigger_operator || 'option_selected') === condData.trigger_operator &&
                c.target_form?.id === targetFormId
        );
    };

    return (
        <AppLayout>
            <Head title="Pengaturan Pola Jadwal" />

            <div className="space-y-6 pb-12">
                {/* HEADER HALAMAN */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                            <Settings className="w-6 h-6 text-slate-700" />
                            Pengaturan Pola Jadwal
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Atur template form inspeksi, pilih banyak mesin sekaligus, dan tentukan teknisi PIC penanggung jawab task.
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={openCreateModal}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                            + Buat Pengaturan Baru
                        </button>
                    )}
                </div>

                {/* GRID DAFTAR JADWAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[720px] overflow-y-auto pr-1">
                    {schedules && schedules.length > 0 ? (
                        schedules.map((sch) => {
                            const machineList = sch.machines || [];

                            return (
                                <div
                                    key={sch.id}
                                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <div className="min-w-0">
                                                <h3
                                                    className="font-bold text-sm text-slate-900 truncate"
                                                    title={sch.form?.form_title}
                                                >
                                                    {sch.form?.form_title || 'Form Terhapus'}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {sch.form?.form_code} &bull; {sch.schedule_code}
                                                </p>
                                            </div>

                                            {/* Tombol Toggle AKTIF / NONAKTIF */}
                                            <button
                                                type="button"
                                                onClick={() => toggleStatus(sch.id, sch.is_active)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${
                                                    sch.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                                }`}
                                                title="Klik untuk mengubah status"
                                            >
                                                <Power className="w-3 h-3" />
                                                {sch.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </button>
                                        </div>

                                        <div className="space-y-2 mt-4 text-xs">
                                            {/* MESIN & TARGET PIC */}
                                            <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/50 space-y-1.5">
                                                <div className="flex justify-between items-center text-slate-600 font-bold text-[11px]">
                                                    <span className="flex items-center gap-1">
                                                        <Cpu className="w-3.5 h-3.5 text-slate-500" /> Mesin Terjadwal:
                                                    </span>
                                                    <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                                                        {machineList.length} Mesin
                                                    </span>
                                                </div>

                                                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                                                    {machineList.length > 0 ? (
                                                        machineList.map((m) => {
                                                            const targeted = m.targeted_pics || [];
                                                            return (
                                                                <div
                                                                    key={m.machine_id}
                                                                    className="text-[11px] bg-white border border-slate-200/80 rounded-lg p-1.5"
                                                                >
                                                                    <div className="font-semibold text-slate-800">
                                                                        {m.machine_name || m.machine_code}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                                                        <span>
                                                                            {targeted.length > 0
                                                                                ? targeted.map((p) => p.full_name).join(', ')
                                                                                : 'Semua PIC Mesin'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                            Belum ada mesin
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3" /> Frekuensi:
                                                </span>
                                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 rounded-md">
                                                    {sch.frequency_type}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Tenggat:
                                                </span>
                                                <span className="font-medium text-slate-800">
                                                    {sch.due_window_days} Hari
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        'Apakah Anda yakin ingin menghapus pengaturan jadwal ini secara permanen? Data task yang sudah terlanjur dibuat tidak akan terhapus.'
                                                    )
                                                ) {
                                                    router.delete(`/schedules/${sch.id}`, {
                                                        preserveScroll: true,
                                                    });
                                                }
                                            }}
                                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(sch)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                            <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-bold text-slate-700 mb-1">Belum ada pengaturan jadwal</p>
                            <p className="text-xs">Silakan klik "Buat Pengaturan Baru" untuk mulai mengatur pola.</p>
                        </div>
                    )}
                </div>

                {/* SECTION KONDISI TRIGGER */}
                <div className="pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                Kondisi Trigger Antar Form Inspeksi
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
                                Hubungkan form inspeksi utama dengan form inspeksi lanjutan. Saat jawaban trigger dipilih, sistem otomatis membuat task form lanjutan dengan tenggat keesokan harinya.
                            </p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateConditionModal}
                                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                            >
                                + Buat Kondisi Baru
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[720px] overflow-y-auto pr-1">
                        {conditions && conditions.length > 0 ? (
                            conditions.map((cond) => (
                                <div
                                    key={cond.id}
                                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    Form Trigger
                                                </p>
                                                <h3
                                                    className="font-bold text-sm text-slate-900 truncate"
                                                    title={cond.trigger_form?.form_title}
                                                >
                                                    {cond.trigger_form?.form_title || 'Form Terhapus'}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {cond.trigger_form?.form_code}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => toggleConditionStatus(cond.id)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${
                                                    cond.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                                }`}
                                                title="Klik untuk mengubah status"
                                            >
                                                <Power className="w-3 h-3" />
                                                {cond.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </button>
                                        </div>

                                        <div className="space-y-2 mt-4 text-xs">
                                            {cond.trigger_section && (
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                                        <Calendar className="w-3 h-3" /> Section:
                                                    </span>
                                                    <span
                                                        className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-right truncate"
                                                        title={`Section ${cond.trigger_section.section_order} — ${cond.trigger_section.section_title}`}
                                                    >
                                                        Section {cond.trigger_section.section_order}
                                                        {cond.trigger_section.section_title ? ` — ${cond.trigger_section.section_title}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                                    <FileText className="w-3 h-3" /> Pertanyaan:
                                                </span>
                                                <span
                                                    className="font-semibold text-slate-800 text-right truncate"
                                                    title={cond.trigger_question?.question_text}
                                                >
                                                    {cond.trigger_question?.question_text || '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                                    <Zap className="w-3 h-3" /> Kondisi trigger:
                                                </span>
                                                <span
                                                    className={`font-semibold px-2 py-0.5 rounded-md text-right truncate ${
                                                        cond.trigger_operator === 'empty' || cond.trigger_operator === 'file_empty'
                                                            ? 'text-amber-700 bg-amber-50'
                                                            : cond.trigger_option?.is_normal === false
                                                            ? 'text-rose-700 bg-rose-50'
                                                            : 'text-emerald-700 bg-emerald-50'
                                                    }`}
                                                    title={cond.trigger_rule_label || cond.trigger_option?.option_text || '-'}
                                                >
                                                    {cond.trigger_rule_label || cond.trigger_option?.option_text || '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0">
                                                    <ArrowRight className="w-3 h-3" /> Form Lanjutan:
                                                </span>
                                                <span
                                                    className="font-semibold text-slate-800 bg-slate-100 px-2 rounded-md text-right truncate"
                                                    title={cond.target_form?.form_title}
                                                >
                                                    {cond.target_form?.form_title || 'Form Terhapus'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Tenggat:
                                                </span>
                                                <span className="font-medium text-slate-800">
                                                    {cond.due_window_days} Hari (besok)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        'Apakah Anda yakin ingin menghapus kondisi trigger ini secara permanen? Task yang sudah terlanjur dibuat tidak akan terhapus.'
                                                    )
                                                ) {
                                                    deleteCondition(cond.id);
                                                }
                                            }}
                                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditConditionModal(cond)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit3 className="w-3 h-3" /> Edit
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                                <Zap className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700 mb-1">Belum ada kondisi trigger</p>
                                <p className="text-xs">
                                    Buat kondisi agar jawaban tertentu pada inspeksi otomatis membuat task inspeksi lanjutan besok.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL SETTINGS JADWAL (MULTI-MESIN & TARGET PIC) */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                                        {editingSchedule ? 'Edit Pola Jadwal' : 'Buat Pengaturan Pola Jadwal'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        1 form inspeksi dapat dijadwalkan ke lebih dari 1 mesin, dan PIC masing-masing mesin dapat ditargetkan secara spesifik.
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="text-slate-400 hover:text-rose-600 font-bold text-lg"
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                {/* 1. PILIH FORM TEMPLATE */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Pilih Template Form *
                                    </label>
                                    <select
                                        value={data.form_id}
                                        onChange={(e) => setData('form_id', e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!!editingSchedule}
                                    >
                                        <option value="">-- Pilih Form Inspeksi --</option>
                                        {forms.map((f) => {
                                            const isAlreadyScheduled = !editingSchedule && scheduledFormIds.has(f.id);
                                            const isUsedAsTarget = !editingSchedule && conditionTargetFormIds.has(f.id);
                                            const isDisabled = isAlreadyScheduled || isUsedAsTarget;
                                            return (
                                                <option key={f.id} value={f.id} disabled={isDisabled}>
                                                    {f.form_title} ({f.form_code})
                                                    {isAlreadyScheduled
                                                        ? ' — Sudah dijadwalkan'
                                                        : isUsedAsTarget
                                                        ? ' — Sudah dipakai di Kondisi Trigger'
                                                        : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {!editingSchedule && forms.length > 0 && !hasAvailableScheduleForm && (
                                        <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                                            Semua form inspeksi sudah memiliki jadwal. Silakan edit jadwal yang ada di halaman ini.
                                        </span>
                                    )}
                                    {editingSchedule && (
                                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                                            Form tidak dapat diubah. Buat jadwal baru untuk form lain.
                                        </span>
                                    )}
                                    {errors.form_id && (
                                        <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                            {errors.form_id}
                                        </span>
                                    )}
                                </div>

                                {/* 2. PILIH BANYAK MESIN & TARGET PIC */}
                                <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-800">
                                                Target Mesin & Penanggung Jawab PIC *
                                            </label>
                                            <p className="text-[10px] text-slate-500">
                                                Centang mesin yang ditargetkan ({data.machine_assignments.length} dipilih).
                                            </p>
                                        </div>

                                        {/* Search Filter Mesin */}
                                        <div className="relative w-full sm:w-48">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                            <input
                                                type="text"
                                                value={machineSearch}
                                                onChange={(e) => setMachineSearch(e.target.value)}
                                                placeholder="Cari mesin / PIC..."
                                                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-600"
                                            />
                                        </div>
                                    </div>

                                    {/* DAFTAR MESIN */}
                                    <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 pt-1">
                                        {filteredMachines.map((m) => {
                                            const assignment = data.machine_assignments.find(
                                                (ma) => ma.machine_id === m.id
                                            );
                                            const isSelected = !!assignment;
                                            const assignedUserIds = assignment?.assigned_user_ids || [];

                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`border rounded-xl p-3 transition-colors ${
                                                        isSelected
                                                            ? 'border-emerald-500 bg-white shadow-2xs'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    {/* Baris Checkbox Mesin */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <label
                                                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleMachine(m.id);
                                                            }}
                                                        >
                                                            <div
                                                                className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-emerald-600 text-white'
                                                                        : 'border border-slate-300 bg-slate-50'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-xs font-bold text-slate-900 block truncate">
                                                                    {m.machine_code} - {m.machine_name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500">
                                                                    Lokasi: {m.location} &bull; Dept: {m.department}
                                                                </span>
                                                            </div>
                                                        </label>

                                                        {isSelected && m.pics.length > 0 && (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        selectAllPics(
                                                                            m.id,
                                                                            m.pics.map((p) => p.id)
                                                                        )
                                                                    }
                                                                    className="text-[10px] text-emerald-700 hover:underline font-semibold"
                                                                >
                                                                    Pilih Semua
                                                                </button>
                                                                <span className="text-slate-300">&bull;</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clearPics(m.id)}
                                                                    className="text-[10px] text-slate-500 hover:underline"
                                                                >
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* SUB-PANEL: PILIH TARGET PIC */}
                                                    {isSelected && (
                                                        <div className="mt-2.5 pt-2 border-t border-slate-100 bg-slate-50/70 -mx-3 -mb-3 p-3 rounded-b-xl space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                                    <Users className="w-3 h-3" /> PIC Departemen yang Ditargetkan:
                                                                </span>
                                                                <span className="text-[10px] text-slate-500">
                                                                    {assignedUserIds.length > 0
                                                                        ? `${assignedUserIds.length} PIC ditargetkan`
                                                                        : 'Terbuka untuk semua PIC mesin ini'}
                                                                </span>
                                                            </div>

                                                            {m.pics.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                    {m.pics.map((pic) => {
                                                                        const isPicChecked = assignedUserIds.includes(pic.id);
                                                                        return (
                                                                            <button
                                                                                key={pic.id}
                                                                                type="button"
                                                                                onClick={() => toggleMachinePic(m.id, pic.id)}
                                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                                                    isPicChecked
                                                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                                                                }`}
                                                                            >
                                                                                <div
                                                                                    className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${
                                                                                        isPicChecked
                                                                                            ? 'bg-white text-emerald-600'
                                                                                            : 'border border-slate-300'
                                                                                    }`}
                                                                                >
                                                                                    {isPicChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                                                                </div>
                                                                                <span>{pic.full_name}</span>
                                                                                <span
                                                                                    className={`text-[9px] font-mono ${
                                                                                        isPicChecked ? 'text-emerald-100' : 'text-slate-400'
                                                                                    }`}
                                                                                >
                                                                                    ({pic.role})
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>
                                                                        Mesin ini belum memiliki PIC terdaftar. Atur PIC mesin di Master Mesin terlebih dahulu.
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {filteredMachines.length === 0 && (
                                            <p className="text-center text-xs text-slate-400 py-4">
                                                Tidak ada mesin yang cocok dengan pencarian.
                                            </p>
                                        )}
                                    </div>

                                    {data.machine_assignments.length === 0 && (
                                        <span className="text-[10px] text-rose-600 font-bold block pt-1">
                                            Wajib memilih minimal satu mesin.
                                        </span>
                                    )}
                                </div>

                                {/* 3. FREKUENSI & TENGGAT */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Frekuensi *
                                        </label>
                                        <select
                                            value={data.frequency_type}
                                            onChange={(e) => {
                                                setData((prev) => ({
                                                    ...prev,
                                                    frequency_type: e.target.value,
                                                    selected_days: [],
                                                    selected_dates: [],
                                                }));
                                            }}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        >
                                            <option value="DAILY">DAILY (Setiap Hari)</option>
                                            <option value="WEEKLY">WEEKLY (Mingguan)</option>
                                            <option value="MONTHLY">MONTHLY (Bulanan)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Batas Tenggat (Hari) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.due_window_days}
                                            onChange={(e) => setData('due_window_days', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {errors.due_window_days && (
                                            <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                {errors.due_window_days}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {data.frequency_type === 'WEEKLY' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Pilih Hari (berulang tiap minggu) *
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {DAYS_OF_WEEK.map((d) => {
                                                const active = data.selected_days.includes(d.value);
                                                return (
                                                    <button
                                                        key={d.value}
                                                        type="button"
                                                        onClick={() => toggleDay(d.value)}
                                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-colors cursor-pointer ${
                                                            active
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {d.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {data.selected_days.length === 0 && (
                                            <span className="text-[10px] text-rose-600 font-semibold block">
                                                Pilih minimal satu hari.
                                            </span>
                                        )}
                                        {data.selected_days.length > 0 && (
                                            <div className="pt-1">
                                                <p className="text-[10px] font-bold text-slate-500">
                                                    Akan dibuat task setiap minggu pada:
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {weeklyPreview().map((label) => (
                                                        <span
                                                            key={label}
                                                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                                                        >
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {data.frequency_type === 'MONTHLY' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Pilih Tanggal *
                                        </label>
                                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((num) => {
                                                const active = data.selected_dates.includes(num);
                                                return (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => toggleDateNum(num)}
                                                        className={`py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold border transition-colors ${
                                                            active
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-pointer'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                                                        }`}
                                                    >
                                                        {num}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {data.selected_dates.length === 0 && (
                                            <span className="text-[10px] text-rose-600 font-semibold block">
                                                Pilih minimal satu tanggal.
                                            </span>
                                        )}
                                        {data.selected_dates.length > 0 && (
                                            <div className="space-y-1 pt-1">
                                                <p className="text-[10px] font-bold text-slate-500">
                                                    Akan digenerate untuk bulan depan:
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {monthlyPreview().map((label, idx) => (
                                                        <span
                                                            key={`${label}-${idx}`}
                                                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                                                        >
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                                {monthlySkipped().length > 0 && (
                                                    <p className="text-[10px] text-amber-600 font-semibold">
                                                        &#9888; Tanggal {monthlySkipped().join(', ')} tidak ada di bulan depan, jadi tidak akan dibuat task-nya.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {processing
                                            ? 'Menyimpan...'
                                            : editingSchedule
                                            ? 'Simpan Perubahan'
                                            : 'Simpan Pola Jadwal'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL KONDISI TRIGGER */}
                {isConditionModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-sm sm:text-base font-black text-slate-900">
                                    {editingCondition ? 'Edit Kondisi Trigger' : 'Buat Kondisi Trigger Baru'}
                                </h3>
                                <button
                                    onClick={closeConditionModal}
                                    className="text-slate-400 hover:text-rose-600 font-bold text-lg"
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={submitCondition} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Template Form Trigger *
                                    </label>
                                    <select
                                        value={condData.trigger_form_id}
                                        onChange={(e) => {
                                            setSelectedConditionSectionId('');
                                            setCondData((prev) => ({
                                                ...prev,
                                                trigger_form_id: e.target.value,
                                                trigger_question_id: '',
                                                trigger_operator: 'option_selected',
                                                trigger_option_id: '',
                                            }));
                                            loadConditionQuestions(e.target.value);
                                        }}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- Pilih Form Inspeksi --</option>
                                        {forms.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.form_title} ({f.form_code})
                                            </option>
                                        ))}
                                    </select>
                                    {condErrors.trigger_form_id && (
                                        <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                            {condErrors.trigger_form_id}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Section Trigger *
                                    </label>
                                    <select
                                        value={selectedConditionSectionId}
                                        onChange={(e) => {
                                            setSelectedConditionSectionId(e.target.value);
                                            setCondData((prev) => ({
                                                ...prev,
                                                trigger_question_id: '',
                                                trigger_option_id: '',
                                            }));
                                        }}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!condData.trigger_form_id || conditionSections.length === 0}
                                    >
                                        <option value="">-- Pilih Section --</option>
                                        {conditionSections.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                Section {s.section_order}
                                                {s.section_title ? ` — ${s.section_title}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {condData.trigger_form_id && conditionQuestions.length === 0 && (
                                        <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                                            Form ini belum memiliki pertanyaan.
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Pertanyaan Trigger *
                                    </label>
                                    <select
                                        value={condData.trigger_question_id}
                                        onChange={(e) => {
                                            const nextQ = conditionQuestions.find((q) => q.id.toString() === e.target.value);
                                            const defaultOp = nextQ?.operators?.[0]?.value || 'option_selected';
                                            setCondData((prev) => ({
                                                ...prev,
                                                trigger_question_id: e.target.value,
                                                trigger_operator: defaultOp,
                                                trigger_option_id: '',
                                                trigger_value: '',
                                            }));
                                        }}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!selectedConditionSectionId}
                                    >
                                        <option value="">-- Pilih Pertanyaan --</option>
                                        {filteredConditionQuestions.map((q) => (
                                            <option key={q.id} value={q.id}>
                                                {q.question_text} ({q.input_type})
                                            </option>
                                        ))}
                                    </select>
                                    {condErrors.trigger_question_id && (
                                        <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                            {condErrors.trigger_question_id}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Operator Kondisi *
                                    </label>
                                    <select
                                        value={condData.trigger_operator}
                                        onChange={(e) =>
                                            setCondData((prev) => ({
                                                ...prev,
                                                trigger_operator: e.target.value,
                                                trigger_option_id: '',
                                                trigger_value: '',
                                            }))
                                        }
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!condData.trigger_question_id || availableOperators.length === 0}
                                    >
                                        {availableOperators.length === 0 ? (
                                            <option value="">-- Pilih Pertanyaan Terlebih Dahulu --</option>
                                        ) : (
                                            availableOperators.map((op) => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {condErrors.trigger_operator && (
                                        <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                            {condErrors.trigger_operator}
                                        </span>
                                    )}
                                </div>

                                {selectedOperatorObj?.value_kind === 'option' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Jawaban Trigger *
                                        </label>
                                        <select
                                            value={condData.trigger_option_id}
                                            onChange={(e) => setCondData('trigger_option_id', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                            disabled={!condData.trigger_question_id}
                                        >
                                            <option value="">-- Pilih Jawaban --</option>
                                            {(selectedConditionQuestion?.options || []).map((o) => (
                                                <option key={o.id} value={o.id}>
                                                    {o.option_text}
                                                    {o.is_normal === false ? ' (Abnormal)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {condErrors.trigger_option_id && (
                                            <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                {condErrors.trigger_option_id}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {selectedOperatorObj?.needs_value && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Nilai Pembanding *
                                        </label>
                                        <input
                                            type={
                                                selectedOperatorObj.value_kind === 'number'
                                                    ? 'number'
                                                    : selectedOperatorObj.value_kind === 'date'
                                                    ? 'date'
                                                    : selectedOperatorObj.value_kind === 'time'
                                                    ? 'time'
                                                    : 'text'
                                            }
                                            step={selectedOperatorObj.value_kind === 'number' ? 'any' : undefined}
                                            value={condData.trigger_value}
                                            onChange={(e) => setCondData('trigger_value', e.target.value)}
                                            placeholder={
                                                selectedOperatorObj.value_kind === 'number'
                                                    ? 'Contoh: 80'
                                                    : 'Ketik teks/kata kunci pemicu...'
                                            }
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        />
                                        {condErrors.trigger_value && (
                                            <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                {condErrors.trigger_value}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Template Form Lanjutan *
                                        </label>
                                        <select
                                            value={condData.target_form_id}
                                            onChange={(e) => setCondData('target_form_id', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        >
                                            <option value="">-- Pilih Form Inspeksi Lanjutan --</option>
                                            {forms
                                                .filter((f) => f.id.toString() !== condData.trigger_form_id)
                                                .map((f) => {
                                                    const isScheduledRoutine = allScheduledFormIds.has(f.id);
                                                    const isUsedInOtherCondition = otherConditionTargetFormIds.has(f.id);
                                                    const isDuplicate = isDuplicateConditionTarget(f.id);
                                                    const isDisabled = isScheduledRoutine || isUsedInOtherCondition || isDuplicate;
                                                    return (
                                                        <option key={f.id} value={f.id} disabled={isDisabled}>
                                                            {f.form_title} ({f.form_code})
                                                            {isScheduledRoutine
                                                                ? ' — Sudah dipakai di Jadwal Rutin'
                                                                : isUsedInOtherCondition
                                                                ? ' — Sudah dipakai di Kondisi lain'
                                                                : isDuplicate
                                                                ? ' — Kondisi sudah ada'
                                                                : ''}
                                                        </option>
                                                    );
                                                })}
                                        </select>
                                        {condData.target_form_id &&
                                            allScheduledFormIds.has(Number(condData.target_form_id)) && (
                                                <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                    Form ini sudah digunakan di Pengaturan Pola Jadwal.
                                                </span>
                                            )}
                                        {condData.target_form_id &&
                                            otherConditionTargetFormIds.has(Number(condData.target_form_id)) && (
                                                <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                    Form Lanjutan ini sudah digunakan pada kondisi trigger lain.
                                                </span>
                                            )}
                                        {condData.target_form_id &&
                                            isDuplicateConditionTarget(Number(condData.target_form_id)) && (
                                                <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                    Kondisi trigger dengan kombinasi yang sama sudah ada.
                                                </span>
                                            )}
                                        {condErrors.target_form_id && (
                                            <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                {condErrors.target_form_id}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Batas Tenggat (Hari) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={condData.due_window_days}
                                            onChange={(e) => setCondData('due_window_days', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {condErrors.due_window_days && (
                                            <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                                {condErrors.due_window_days}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={closeConditionModal}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={condProcessing}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-700 cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {condProcessing
                                            ? 'Menyimpan...'
                                            : editingCondition
                                            ? 'Simpan Perubahan'
                                            : 'Buat Kondisi'}
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
