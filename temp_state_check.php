<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== SCHEDULE_CONDITIONS ===\n";
$conds = DB::table('schedule_conditions')->get();
if ($conds->isEmpty()) { echo "(kosong)\n"; }
foreach ($conds as $c) {
    echo "#{$c->id} {$c->condition_code} trigger_form={$c->trigger_form_id} q={$c->trigger_question_id} opt={$c->trigger_option_id} target={$c->target_form_id} active={$c->is_active}\n";
}

echo "\n=== FORM 1 QUESTIONS/OPTIONS (sekarang) ===\n";
$qs = DB::table('form_questions')->where('form_id', 1)->orderBy('question_order')->get();
foreach ($qs as $q) {
    $opts = DB::table('form_options')->where('form_question_id', $q->id)->orderBy('option_order')
        ->get()->map(fn ($o) => "o#{$o->id}:'{$o->option_text}'")->implode(', ');
    echo "q#{$q->id} [{$q->input_type}] {$q->question_text} => {$opts}\n";
}
if ($qs->isEmpty()) { echo "(form 1 tidak punya pertanyaan!)\n"; }

echo "\n=== SEMUA FORMS ===\n";
foreach (DB::table('forms')->orderBy('id')->get() as $f) {
    echo "#{$f->id} [{$f->form_type}] {$f->form_code} - {$f->form_title}\n";
}
