<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Form;
use App\Models\FormQuestion;
use App\Models\FormOption;
use App\Models\ScheduleCondition;
use App\Http\Controllers\FormController;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

$controller = app(FormController::class);
$form = Form::with('sections.questions.options')->findOrFail(1);
$q1 = $form->sections->flatMap->questions->first();
$o5 = FormOption::find(5);
$o6 = FormOption::find(6);
$origO5 = $o5->option_text;

echo "Form 1 q#1: {$q1->question_text} | options: o#{$o5->id}:'{$o5->option_text}', o#{$o6->id}:'{$o6->option_text}'\n";

// Form target sementara + kondisi pada (form 1, q#1, o#5)
$targetForm = Form::create([
    'machine_id' => 1,
    'form_code' => 'FRMIDFIX' . strtoupper(substr(uniqid(), -4)),
    'form_type' => 'INSPECTION',
    'form_title' => '[TEST] id-fix target',
    'form_description' => '-',
]);
$cond = ScheduleCondition::create([
    'condition_code' => 'CON-IDFIX' . strtoupper(substr(uniqid(), 0, 6)),
    'trigger_form_id' => 1,
    'trigger_question_id' => $q1->id,
    'trigger_option_id' => $o5->id,
    'target_form_id' => $targetForm->id,
    'due_window_days' => 1,
    'is_active' => true,
]);
echo "Kondisi uji: {$cond->condition_code} (q={$q1->id}, opt={$o5->id})\n\n";

$buildPayload = function (bool $withOptionIds, bool $dropQuestion, ?string $renameO5 = null) use ($form, $q1) {
    $sections = [];
    foreach ($form->sections as $section) {
        $questions = [];
        foreach ($section->questions as $q) {
            if ($dropQuestion && $q->id === $q1->id) continue;
            $options = [];
            foreach ($q->options as $o) {
                $opt = [
                    'option_text' => ($o->id === 5 && $renameO5) ? $renameO5 : $o->option_text,
                    'is_normal' => (bool) $o->is_normal,
                    'option_order' => $o->option_order,
                    'goto_form_section_id' => $o->goto_form_section_id,
                ];
                if ($withOptionIds) {
                    $opt = ['id' => $o->id] + $opt;
                }
                $options[] = $opt;
            }
            $questions[] = [
                'id' => $q->id,
                'question_text' => $q->question_text,
                'input_type' => $q->input_type->value,
                'is_required' => (bool) $q->is_required,
                'options' => $options,
            ];
        }
        $sections[] = [
            'id' => $section->id,
            'section_title' => $section->section_title,
            'section_description' => $section->section_description,
            'questions' => $questions,
        ];
    }
    return [
        'metadata' => [
            'form_type' => $form->form_type->value,
            'machine_id' => (string) $form->machine_id,
            'form_title' => $form->form_title,
            'form_description' => $form->form_description,
        ],
        'sections' => $sections,
    ];
};

// [A] Payload FIXED (id opsi ikut) + rename teks opsi -> harus SUKSES, id opsi stabil
try {
    $controller->update(Request::create('/forms/1', 'PUT', $buildPayload(true, false, 'RENAME-TEST')), 1);
    $o5after = FormOption::find(5);
    echo "[A] Update dengan id opsi (rename): SUKSES\n";
    echo "    o#5 masih id 5: " . ($o5after && $o5after->id === 5 ? 'YA (ID stabil)' : 'TIDAK') . " | kondisi utuh: " . (ScheduleCondition::find($cond->id) ? 'YA' : 'HILANG') . "\n";
} catch (ValidationException $e) {
    echo "[A] SALAH DIBLOKIR: " . json_encode($e->errors()) . "\n";
}
echo "\n";

// [B] Payload FIXED tapi pertanyaan q#1 DIHAPUS -> harus DIBLOKIR via errors.condition
try {
    $controller->update(Request::create('/forms/1', 'PUT', $buildPayload(true, true)), 1);
    echo "[B] Hapus pertanyaan trigger: TIDAK DIBLOKIR (GAGAL)\n";
} catch (ValidationException $e) {
    echo "[B] Hapus pertanyaan trigger: DIBLOKIR\n";
    echo "    error.condition: " . ($e->errors()['condition'][0] ?? '-') . "\n";
}
echo "    q#1 masih ada: " . (FormQuestion::find($q1->id) ? 'YA' : 'HILANG (RUSAK!)') . "\n";
echo "    kondisi masih ada: " . (ScheduleCondition::find($cond->id) ? 'YA' : 'HILANG (RUSAK!)') . "\n\n";

// [C] Payload LAMA (id opsi TIDAK ikut, skenario frontend lama) -> harus DIBLOKIR
try {
    $controller->update(Request::create('/forms/1', 'PUT', $buildPayload(false, false)), 1);
    echo "[C] Payload tanpa id opsi: TIDAK DIBLOKIR (GAGAL)\n";
} catch (ValidationException $e) {
    echo "[C] Payload tanpa id opsi (skenario churn lama): DIBLOKIR\n";
    echo "    error.condition: " . ($e->errors()['condition'][0] ?? '-') . "\n";
}
echo "    o#5 masih ada: " . (FormOption::find(5) ? 'YA' : 'HILANG') . " | kondisi utuh: " . (ScheduleCondition::find($cond->id) ? 'YA' : 'HILANG') . "\n\n";

// Restore data asli + cleanup
FormOption::where('id', 5)->update(['option_text' => $origO5]);
ScheduleCondition::where('id', $cond->id)->delete();
Form::where('id', $targetForm->id)->delete();
echo "Restore + cleanup selesai. Sisa kondisi: " . ScheduleCondition::count() . "\n";
echo "Options q#1 sekarang: " . FormOption::where('form_question_id', $q1->id)->orderBy('option_order')->get()->map(fn ($o) => "o#{$o->id}:'{$o->option_text}'")->implode(', ') . "\n";
