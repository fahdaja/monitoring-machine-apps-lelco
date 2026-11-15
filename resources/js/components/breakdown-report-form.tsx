import DynamicFormModal from './dynamic-form-modal';
import type { FormPayload, FormQuestion, FormOption } from './dynamic-form-modal';

export type { FormPayload as ReportForm, FormQuestion as ReportQuestion, FormOption as ReportOption };

interface BreakdownReportFormProps {
    form: FormPayload;
    machine: { id: number; machineCode?: string; machineName?: string };
    onClose: () => void;
}

/**
 * Modal "Laporkan Breakdown" pada halaman detail mesin.
 * Daftar pertanyaan diambil dari form kategori MANUAL_REPORT, jawaban disimpan ke ticket_submissions.
 */
export default function BreakdownReportForm({ form, machine, onClose }: BreakdownReportFormProps) {
    return (
        <DynamicFormModal
            form={form}
            heading={form.form_title || 'Laporkan Breakdown Mesin'}
            subheading={`${machine.machineCode ?? `#${machine.id}`} • ${machine.machineName ?? '-'}`}
            action="/breakdowns"
            extraData={{ machine_id: machine.id, form_id: form.id }}
            submitLabel="Kirim Laporan Breakdown"
            tone="rose"
            onClose={onClose}
        />
    );
}
