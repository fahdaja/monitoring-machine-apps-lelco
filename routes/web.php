<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Http\Controllers\MachineController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;

// Auth Routes
Route::get('/login', [AuthController::class, 'create']);
Route::post('/login', [AuthController::class, 'store']);
Route::post('/logout', [AuthController::class, 'destroy']);

Route::get('/inspection-form',function(){
    return inertia('inspectionForm');
})->name('inspection-form');

Route::get('/dashboard', function () {
    return inertia('dashboard', [
        'summary' => [
            'totalMachines' => 12,
            'running' => 9,
            'breakdown' => 3,
        ],
        'myMachines' => [],
        'myProblems' => [],
        'breakdowns' => [],
        'statusCounts' => [
            'RUNNING' => 9,
            'BREAKDOWN' => 3,
            'STANDBY' => 0,
            'MAINTENANCE' => 0,
        ],
        'syncedAt' => now()->format('H:i:s'),
    ]);
})->middleware(['auth', 'role:ADMIN,OPERATOR,MAINTENANCE_L2']);

Route::get('/machines', [MachineController::class, 'index'])->name('machines.index');
Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('/machines/create', [MachineController::class, 'create'])->name('machines.create');
    Route::post('/machines', [MachineController::class, 'store'])->name('machines.store');
    Route::get('/machines/{machineId}/edit', [MachineController::class, 'edit'])->name('machines.edit');
    Route::put('/machines/{machineId}', [MachineController::class, 'update'])->name('machines.update');
    Route::delete('/machines/{machineId}', [MachineController::class, 'destroy'])->name('machines.destroy');
});
Route::get('/machines/{machineId}', [MachineController::class, 'show'])->name('machines.show');


Route::get('/breakdowns',function(){
    return inertia('breakdown/index');
})->name('breakdowns.index');


Route::get('/inspection-tasks', function () {
    return Inertia::render('tasks/index', [
        'calendarData' => [
            'year' => 2026,
            'month' => 10,
            'daysInMonth' => 31,
            'firstWeekday' => 3, // Kamis (0 = Senin)
            'today' => '2026-10-13',
            'tasks' => [
                [
                    'taskId' => 'TSK-202610-001',
                    'machineId' => 'MCH-001',
                    'machineName' => 'Hydraulic Press 500T',
                    'activity' => 'Pemeriksaan Rutin Level Oli & Kebocoran Valve',
                    'level' => 'L1',
                    'scheduledDate' => '2026-10-13',
                    'location' => 'Line A - Area 01',
                    'status' => 'DUE',
                ],
                [
                    'taskId' => 'TSK-202610-002',
                    'machineId' => 'MCH-004',
                    'machineName' => 'CNC Milling VMC850',
                    'activity' => 'Inspeksi Vibrasi Spindle & Pelumasan Guide Way',
                    'level' => 'L2',
                    'scheduledDate' => '2026-10-12',
                    'location' => 'Line B - Area 03',
                    'status' => 'OVERDUE',
                ],
                [
                    'taskId' => 'TSK-202610-003',
                    'machineId' => 'MCH-002',
                    'machineName' => 'Robotic Arm Welding',
                    'activity' => 'Inspeksi Tekanan Pneumatik & Kebersihan Tip Torch',
                    'level' => 'L1',
                    'scheduledDate' => '2026-10-13',
                    'location' => 'Line A - Area 02',
                    'status' => 'COMPLETED',
                    'inspectorName' => 'Budi Santoso',
                    'completedAt' => '09:15',
                ],
                [
                    'taskId' => 'TSK-202610-004',
                    'machineId' => 'MCH-009',
                    'machineName' => 'Compressor Screw 55KW',
                    'activity' => 'Pemeriksaan Air Filter & Drain Condensate Tank',
                    'level' => 'L1',
                    'scheduledDate' => '2026-10-15',
                    'location' => 'Utility Room',
                    'status' => 'UPCOMING',
                ],
            ],
        ],
    ]);
})->name('tasks.index');

Route::get('forms', [FormController::class, 'index'])->middleware(['auth', 'role:ADMIN']);
Route::get('/forms/create', [FormController::class, 'create'])->middleware(['auth', 'role:ADMIN']);

Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index'); // <-- Wajib ada name ini
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users/create', [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{id}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
});