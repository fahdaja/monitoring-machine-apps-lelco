<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Http\Controllers\MachineController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\BreakdownController;

// Auth Routes
Route::get('/login', [AuthController::class, 'create']);
Route::post('/login', [AuthController::class, 'store']);
Route::post('/logout', [AuthController::class, 'destroy']);
Route::get('/scan/machine/{machineCode}', [TaskController::class, 'handleQrScanRedirect']);
Route::get('/inspection-calender', [TaskController::class, 'index'])->name('tasks.index')->middleware(['auth', 'role:ADMIN,OPERATOR']);
Route::get('/api/scan-task/{code}', [TaskController::class, 'apiFindTaskByMachine']);

Route::middleware(['auth', 'role:ADMIN,OPERATOR'])->group(function () {
    Route::get('/inspection-form/{id}',[TaskController::class, 'show'])->name('tasks.show');
    Route::post('/inspection-form/upload-temp', [TaskController::class, 'uploadTempFile']);
    Route::post('/inspection-form/remove-file', [TaskController::class, 'removeFile']);
    Route::post('/inspection-form/{id}/draft', [TaskController::class, 'saveDraft']);
    Route::post('/inspection-form/{id}/submit', [TaskController::class, 'submit']);
});

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


Route::get('/breakdowns', [BreakdownController::class, 'index'])->name('breakdowns.index');
Route::post('/breakdowns/{ticketCode}/acknowledge', [BreakdownController::class, 'acknowledge'])->name('breakdowns.acknowledge');
Route::put('/breakdowns/{ticketCode}/status', [BreakdownController::class, 'updateStatus'])->name('breakdowns.updateStatus');
Route::post('/breakdowns/{ticketCode}/close', [BreakdownController::class, 'close'])->name('breakdowns.close');
Route::put('/breakdowns/{ticketCode}/verify-close', [BreakdownController::class, 'verifyClose'])->name('breakdowns.verifyClose');


Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('forms', [FormController::class, 'index'])->name('forms.index');
    Route::get('/forms/create', [FormController::class, 'create'])->name('forms.create');
    Route::post('/forms', [FormController::class, 'store'])->name('forms.store');
    Route::get('/forms/{id}/edit', [FormController::class, 'edit'])->name('forms.edit');
    Route::put('/forms/{id}', [FormController::class, 'update'])->name('forms.update');
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');
    Route::delete('/form-questions/{question}/image', [FormController::class, 'destroyImage'])->name('questions.image.destroy');
});


Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::post('/schedules', [ScheduleController::class, 'store'])->name('schedules.store');
});

Route::middleware(['auth', 'role:ADMIN'])->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index'); // <-- Wajib ada name ini
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users/create', [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{id}/edit', [UserController::class, 'edit'])->name('users.edit');
   Route::match(['put', 'post'], '/forms/{id}', [FormController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
});