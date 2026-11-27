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
use App\Http\Controllers\KanbanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuditExportController;
use App\Http\Middleware\CheckUserStatus;

// Root redirect langsung ke halaman login
Route::redirect('/', '/login');

// Auth Routes (hanya untuk guest; login dilindungi rate-limit anti brute-force)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'create'])->name('login');
    Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:10,1');
});

Route::post('/logout', [AuthController::class, 'destroy'])->middleware('auth');

Route::middleware(['auth', 'CheckUserStatus', 'role:ADMIN,OPERATOR,MAINTENANCE,SUPERVISOR,ENGINEERING,VENDOR'])->group(function () {
    Route::get('/scan/machine/{machineCode}', [TaskController::class, 'handleQrScanRedirect']);
    Route::get('/inspection-calender', [TaskController::class, 'index'])->name('tasks.index');
    Route::get('/api/scan-task/{code}', [TaskController::class, 'apiFindTaskByMachine']);
    Route::get('/scan-task/{code}', [TaskController::class, 'handleQrScanRedirect'])->name('scan-task');

    Route::get('/inspection-form/{id}', [TaskController::class, 'show'])->name('tasks.show');
    Route::post('/inspection-form/upload-temp', [TaskController::class, 'uploadTempFile']);
    Route::post('/inspection-form/remove-file', [TaskController::class, 'removeFile']);
    Route::post('/inspection-form/{id}/draft', [TaskController::class, 'saveDraft']);
    Route::post('/inspection-form/{id}/submit', [TaskController::class, 'submit']);

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/machines', [MachineController::class, 'index'])->name('machines.index');
});

Route::get('/audit/export-excel', [AuditExportController::class, 'export'])
    ->name('audit.export-excel')
    ->middleware(['auth', 'CheckUserStatus', 'role:ADMIN,SUPERVISOR']);

Route::middleware(['auth', 'CheckUserStatus', 'role:ADMIN'])->group(function () {
    Route::get('/machines/create', [MachineController::class, 'create'])->name('machines.create');
    Route::post('/machines', [MachineController::class, 'store'])->name('machines.store');
    Route::get('/machines/{machineId}/edit', [MachineController::class, 'edit'])->name('machines.edit');
    Route::put('/machines/{machineId}', [MachineController::class, 'update'])->name('machines.update');
    Route::delete('/machines/{machineId}', [MachineController::class, 'destroy'])->name('machines.destroy');
});

Route::get('/machines/{machineId}', [MachineController::class, 'show'])
    ->name('machines.show')
    ->middleware(['auth', 'CheckUserStatus', 'role:ADMIN,OPERATOR,MAINTENANCE,SUPERVISOR,ENGINEERING,VENDOR']);


Route::middleware(['auth', 'CheckUserStatus'])->group(function () {
    Route::get('/breakdowns', [KanbanController::class, 'index'])->name('breakdowns.index');
    Route::post('/breakdowns', [KanbanController::class, 'storeReport'])->name('breakdowns.store');

    // Aksi penanganan & perbaikan breakdown: hanya MAINTENANCE (dan ADMIN)
    Route::middleware(['role:ADMIN,MAINTENANCE'])->group(function () {
        Route::post('/breakdowns/{ticketCode}/acknowledge', [KanbanController::class, 'acknowledge'])->name('breakdowns.acknowledge');
        Route::put('/breakdowns/{ticketCode}/status', [KanbanController::class, 'updateStatus'])->name('breakdowns.updateStatus');
        Route::post('/breakdowns/{ticketCode}/close', [KanbanController::class, 'close'])->name('breakdowns.close');

        // Form transisi kanban: repair & closing disimpan ke ticket_submissions
        Route::get('/breakdowns/{ticketCode}/form/{context}/data', [KanbanController::class, 'ticketFormData'])->name('breakdowns.form.data');
        Route::get('/breakdowns/{ticketCode}/form/{context}', [KanbanController::class, 'showTicketForm'])->name('breakdowns.form');
        Route::post('/breakdowns/{ticketCode}/submissions', [KanbanController::class, 'submitTicketForm'])->name('breakdowns.submissions.store');
    });

    // Verifikasi & penutupan tiket: hanya SUPERVISOR (dan ADMIN)
    Route::put('/breakdowns/{ticketCode}/verify-close', [KanbanController::class, 'verifyClose'])
        ->middleware('role:ADMIN,SUPERVISOR')
        ->name('breakdowns.verifyClose');

    // Halaman detail tiket: submission laporan/repair/closing (read-only)
    Route::get('/breakdowns/{ticketCode}', [KanbanController::class, 'detail'])->name('breakdowns.detail');
});


Route::middleware(['auth', 'CheckUserStatus','role:ADMIN'])->group(function () {
    Route::get('forms', [FormController::class, 'index'])->name('forms.index');
    Route::get('/forms/create', [FormController::class, 'create'])->name('forms.create');
    Route::post('/forms', [FormController::class, 'store'])->name('forms.store');
    Route::get('/forms/{id}/edit', [FormController::class, 'edit'])->name('forms.edit');
    Route::put('/forms/{id}', [FormController::class, 'update'])->name('forms.update');
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');
    Route::delete('/form-questions/{question}/image', [FormController::class, 'destroyImage'])->name('questions.image.destroy');
});


Route::middleware(['auth', 'CheckUserStatus','role:ADMIN'])->group(function () {
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::post('/schedules', [ScheduleController::class, 'store'])->name('schedules.store');
    Route::put('/schedules/{id}', [ScheduleController::class, 'update'])->name('schedules.update');
    Route::patch('/schedules/{id}/toggle', [ScheduleController::class, 'toggleStatus'])->name('schedules.toggle');
    Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy'])->name('schedules.destroy');

    // Kondisi trigger antar form inspeksi
    Route::get('/schedules/condition-questions/{formId}', [ScheduleController::class, 'conditionQuestions'])->name('schedules.conditionQuestions');
    Route::post('/schedule-conditions', [ScheduleController::class, 'storeCondition'])->name('schedule-conditions.store');
    Route::put('/schedule-conditions/{id}', [ScheduleController::class, 'updateCondition'])->name('schedule-conditions.update');
    Route::patch('/schedule-conditions/{id}/toggle', [ScheduleController::class, 'toggleConditionStatus'])->name('schedule-conditions.toggle');
    Route::delete('/schedule-conditions/{id}', [ScheduleController::class, 'destroyCondition'])->name('schedule-conditions.destroy');

    // Buat task inspeksi dadakan khusus hari ini (tanggal yang sama)
    Route::post('/tasks/create-today', [TaskController::class, 'storeToday'])->name('tasks.storeToday');
});

Route::middleware(['auth', 'CheckUserStatus', 'role:ADMIN'])->group(function () {
    Route::match(['put', 'post'], '/forms/{id}', [FormController::class, 'update']);
});

// Manajemen user & permission: role ADMIN.
Route::middleware(['auth', 'CheckUserStatus', 'role:ADMIN'])->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users/create', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/admin/password', [UserController::class, 'updateAdminPassword'])
        ->middleware('throttle:5,1')
        ->name('users.admin.password');
    Route::get('/users/{id}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
});