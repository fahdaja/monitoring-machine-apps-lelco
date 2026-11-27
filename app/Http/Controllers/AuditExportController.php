<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\BreakdownTicket;
use App\Models\Machine;
use App\Models\Task;
use App\Models\TaskSubmission;
use App\Support\SimpleXlsxWriter;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AuditExportController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = ! empty($validated['start_date'])
            ? Carbon::parse($validated['start_date'])->startOfDay()
            : Carbon::now()->startOfMonth()->startOfDay();
        $endDate = ! empty($validated['end_date'])
            ? Carbon::parse($validated['end_date'])->endOfDay()
            : Carbon::now()->endOfDay();

        // 1. Query Tasks (Preventive Maintenance)
        $tasks = Task::with(['machine', 'form', 'user'])
            ->whereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderBy('due_date', 'desc')
            ->get();

        $taskIds = $tasks->pluck('id')->all();
        $submissionsByTask = TaskSubmission::with('user')
            ->whereIn('task_id', empty($taskIds) ? [0] : $taskIds)
            ->orderByDesc('id')
            ->get()
            ->keyBy('task_id');

        // 2. Query Breakdown Tickets
        $tickets = BreakdownTicket::with(['machine', 'reporter', 'assignee', 'verifier'])
            ->whereBetween('reported_at', [$startDate, $endDate])
            ->orderByDesc('reported_at')
            ->get();

        // 3. Query Submissions dalam periode (untuk Detail Jawaban)
        $submissions = TaskSubmission::with(['task.machine', 'task.form', 'user'])
            ->whereBetween('submitted_at', [$startDate, $endDate])
            ->orderByDesc('submitted_at')
            ->get();

        // 4. Query Master Mesin & PIC
        $machines = Machine::with(['pics' => fn ($q) => $q->orderBy('full_name')])
            ->orderBy('machine_code')
            ->get();

        // Hitung Ringkasan KPI Audit
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'COMPLETED')->count();
        $overdueTasks = $tasks->where('status', 'OVERDUE')->count();
        $pmCompliance = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 100.0;

        $totalTickets = $tickets->count();
        $closedTickets = $tickets->filter(fn ($t) => ($t->status instanceof \BackedEnum ? $t->status->value : (string) $t->status) === 'COMPLETED');
        $totalDowntimeMinutes = (int) $tickets->sum(fn ($t) => (int) $t->calculated_downtime);
        $mttrMinutes = $closedTickets->count() > 0
            ? round($closedTickets->avg(fn ($t) => (int) $t->calculated_downtime), 1)
            : 0.0;

        // Sheet 1: Ringkasan KPI Audit
        $summaryRows = [
            ['Periode Audit', $startDate->format('Y-m-d') . ' s/d ' . $endDate->format('Y-m-d')],
            ['Tanggal Export', Carbon::now()->format('Y-m-d H:i:s') . ' WIB'],
            ['Dicetak Oleh', auth()->user()?->full_name ?? auth()->user()?->username ?? '-'],
            ['', ''],
            ['Total Mesin Terdaftar', $machines->count()],
            ['Total Task Preventive Maintenance', $totalTasks],
            ['Task PM Selesai (COMPLETED)', $completedTasks],
            ['Task PM Terlambat (OVERDUE)', $overdueTasks],
            ['PM Compliance Rate (%)', $pmCompliance],
            ['', ''],
            ['Total Tiket Breakdown', $totalTickets],
            ['Tiket Breakdown Selesai (COMPLETED)', $closedTickets->count()],
            ['Total Downtime (Menit)', $totalDowntimeMinutes],
            ['Total Downtime (Jam)', round($totalDowntimeMinutes / 60, 2)],
            ['Rata-rata MTTR (Menit)', $mttrMinutes],
        ];

        // Sheet 2: Inspeksi PM
        $pmRows = [];
        foreach ($tasks as $task) {
            $sub = $submissionsByTask->get($task->id);
            $pmRows[] = [
                $task->task_code ?? '-',
                $task->machine?->machine_code ?? '-',
                $task->machine?->machine_name ?? '-',
                $task->machine?->location ?? '-',
                $task->form?->form_title ?? '-',
                $task->origin_type === 'CONDITION' ? 'LANJUTAN' : 'RUTIN',
                $task->due_date ? $task->due_date->format('Y-m-d') : '-',
                $task->end_date ? $task->end_date->format('Y-m-d') : '-',
                $task->started_at ? $task->started_at->format('Y-m-d H:i') : '-',
                $task->completed_at ? $task->completed_at->format('Y-m-d H:i') : '-',
                $task->status ?? '-',
                $task->is_late ? (int) ($task->late_days ?? 0) : 0,
                $sub?->user?->full_name ?? $task->user?->full_name ?? '-',
                $sub?->submission_code ?? '-',
            ];
        }

        // Sheet 3: Breakdown & Downtime
        $breakdownRows = [];
        foreach ($tickets as $ticket) {
            $statusVal = $ticket->status instanceof \BackedEnum ? $ticket->status->value : (string) $ticket->status;
            $problemsText = is_array($ticket->problems)
                ? implode('; ', array_map(fn ($p) => is_string($p) ? $p : json_encode($p), $ticket->problems))
                : (string) ($ticket->problems ?? '-');

            $breakdownRows[] = [
                $ticket->ticket_code ?? '-',
                $ticket->machine?->machine_code ?? '-',
                $ticket->machine?->machine_name ?? '-',
                $ticket->machine?->location ?? '-',
                $ticket->problem_category ?? '-',
                $problemsText !== '' ? $problemsText : '-',
                $ticket->source_type ?? '-',
                $statusVal,
                $ticket->reporter?->full_name ?? '-',
                $ticket->assignee?->full_name ?? '-',
                $ticket->reported_at ? $ticket->reported_at->format('Y-m-d H:i') : '-',
                $ticket->started_at ? $ticket->started_at->format('Y-m-d H:i') : '-',
                $ticket->closed_at ? $ticket->closed_at->format('Y-m-d H:i') : '-',
                $ticket->verifier?->full_name ?? '-',
                $ticket->verified_at ? $ticket->verified_at->format('Y-m-d H:i') : '-',
                (int) $ticket->calculated_downtime,
                $ticket->root_cause ?? '-',
                $ticket->corrective_action ?? '-',
            ];
        }

        // Sheet 4: Detail Jawaban Inspeksi
        $detailRows = [];
        foreach ($submissions as $sub) {
            $snapshot = is_array($sub->answers_values) ? $sub->answers_values : [];
            $sections = $snapshot['sections'] ?? [];

            foreach ($sections as $section) {
                $sectionTitle = $section['section_title'] ?? ('Section ' . ($section['section_order'] ?? ''));
                foreach ($section['questions'] ?? [] as $q) {
                    $ansVal = $q['answer_detail']['value'] ?? '';
                    if (is_array($ansVal)) {
                        $ansVal = implode(', ', array_filter($ansVal, fn ($v) => $v !== null && $v !== ''));
                    }
                    $selectedOpts = $q['selected_options'] ?? [];
                    if ($ansVal === '' && ! empty($selectedOpts)) {
                        $ansVal = implode(', ', array_map(fn ($o) => $o['option_text'] ?? '', $selectedOpts));
                    }

                    $isAbnormal = ! empty($q['is_abnormal']);
                    $note = $q['answer_detail']['note'] ?? '-';
                    $answeredAt = $q['answer_detail']['answered_at'] ?? '-';

                    $detailRows[] = [
                        $sub->submitted_at ? Carbon::parse($sub->submitted_at)->format('Y-m-d H:i') : '-',
                        $sub->submission_code ?? '-',
                        $sub->task?->task_code ?? '-',
                        $sub->task?->machine?->machine_code ?? '-',
                        $sub->task?->machine?->machine_name ?? '-',
                        $sub->task?->form?->form_title ?? '-',
                        $sub->user?->full_name ?? '-',
                        $sectionTitle,
                        $q['question_text'] ?? '-',
                        $q['standard_text'] ?? '-',
                        (string) $ansVal !== '' ? (string) $ansVal : '-',
                        $answeredAt !== '' ? (string) $answeredAt : '-',
                        $isAbnormal ? 'ABNORMAL' : 'NORMAL',
                        $note !== '' ? (string) $note : '-',
                    ];
                }
            }
        }

        // Sheet 5: Master Mesin & PIC
        $machineRows = [];
        foreach ($machines as $m) {
            $pics = $m->pics->pluck('full_name')->implode(', ');
            $status = $m->machine_status instanceof \BackedEnum ? $m->machine_status->value : (string) $m->machine_status;
            $machineRows[] = [
                $m->machine_code ?? '-',
                $m->machine_name ?? '-',
                $m->location ?? '-',
                $m->department ?? $m->pic_department ?? '-',
                $status,
                $pics !== '' ? $pics : '-',
            ];
        }

        $writer = (new SimpleXlsxWriter())
            ->addSheet('Ringkasan KPI', ['Metrik Audit', 'Nilai'], $summaryRows)
            ->addSheet('Inspeksi PM', [
                'Kode Task', 'Kode Mesin', 'Nama Mesin', 'Lokasi', 'Form Inspeksi',
                'Tipe', 'Tanggal Jadwal', 'Batas Akhir', 'Waktu Mulai', 'Tanggal Selesai',
                'Status', 'Terlambat (Hari)', 'Petugas', 'Kode Submission',
            ], $pmRows)
            ->addSheet('Breakdown & Downtime', [
                'Kode Tiket', 'Kode Mesin', 'Nama Mesin', 'Lokasi', 'Kategori',
                'Deskripsi Masalah', 'Sumber', 'Status', 'Pelapor', 'Teknisi',
                'Waktu Lapor', 'Mulai Perbaikan', 'Waktu Selesai', 'Verifikator',
                'Waktu Verifikasi', 'Downtime (Menit)', 'Root Cause', 'Corrective Action',
            ], $breakdownRows)
            ->addSheet('Detail Jawaban', [
                'Tanggal Submit', 'Kode Submission', 'Kode Task', 'Kode Mesin', 'Nama Mesin',
                'Form Inspeksi', 'Petugas', 'Section', 'Pertanyaan', 'Standar Baku',
                'Jawaban Aktual', 'Waktu Dijawab', 'Status Temuan', 'Catatan Temuan',
            ], $detailRows)
            ->addSheet('Master Mesin & PIC', [
                'Kode Mesin', 'Nama Mesin', 'Lokasi', 'Departemen', 'Status Mesin', 'PIC Mesin',
            ], $machineRows);

        $tmpFile = $writer->writeToTempFile();
        $fileName = sprintf(
            'Audit-Lelco-CMMS-%s_sd_%s.xlsx',
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );

        return response()
            ->download($tmpFile, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }
}
