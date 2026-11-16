<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Task;
use Carbon\Carbon;

class MarkDueTasks extends Command
{
    protected $signature = 'tasks:mark-due';
    protected $description = 'UPCOMING → DUE saat due_date tiba; DUE → OVERDUE saat end_date lewat';

    public function handle()
    {
        $today = Carbon::today()->toDateString();

        $toDue = Task::where('status', 'UPCOMING')
            ->whereDate('due_date', '<=', $today)
            ->update(['status' => 'DUE']);

        $toOverdue = Task::where('status', 'DUE')
            ->whereDate('end_date', '<', $today)
            ->update(['status' => 'OVERDUE']);

        $this->info("✅ {$toDue} task → DUE, {$toOverdue} task → OVERDUE.");
        return Command::SUCCESS;
    }
}
