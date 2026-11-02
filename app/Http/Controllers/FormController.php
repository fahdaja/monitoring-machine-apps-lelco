<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Form;
use App\Models\Machine;
use App\Models\Task;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormOption;

class FormController extends Controller
{
    /**
     * Tampilkan halaman list semua form yang sudah dibuat.
     */
    public function index()
    {
        $forms = Form::with('sections.questions.options')->latest()->get();
        
        return Inertia::render('forms/index', [
            'forms' => $forms,
        ]);
    }

    /**
     * Tampilkan halaman Form Builder untuk membuat form baru.
     */
    public function create()
    {
        $machines = Machine::select('id', 'machine_type')->get();
        return Inertia::render('forms/create', [
            'machines' => $machines,
        ]);
    }

    /**
     * Simpan form baru beserta sections, questions, & options-nya ke DB.
     */
    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {

            // 1. Validasi input dari Frontend
            $validated = $request->validate([
                'metadata.machine_type'         => 'required|string|exists:machines,machine_type',
                'metadata.form_title'           => 'required|string|max:255',
                'metadata.form_description'     => 'nullable|string',
                'metadata.frequency_type'       => 'required|string|in:DAILY,WEEKLY,MONTHLY',
                'metadata.start_date'           => 'required|date',
                'metadata.end_date'             => 'required|date|after_or_equal:metadata.start_date',
                'metadata.due_window_days'      => 'required|integer|min:1',
                'schedule_dates'                => 'required|array|min:1',
                'schedule_dates.*'              => 'required|date',

                // Validasi struktur form sections & questions
                'sections'                      => 'required|array|min:1',
                'sections.*.section_title'      => 'required|string|max:255',
                'sections.*.section_description'=> 'nullable|string',
                'sections.*.questions'          => 'required|array|min:1',
                'sections.*.questions.*.question_text' => 'required|string',
                'sections.*.questions.*.input_type'    => 'required|string|in:TEXT,TEXTAREA,SELECT,CHECKBOX,DROPDOWN,FILE,DATE,TIME',
                'sections.*.questions.*.options'       => 'nullable|array',
            ]);

            $meta = $validated['metadata'];

            // 2. Ambil data Machine berdasarkan machine_type
            $machine = Machine::where('machine_type', $meta['machine_type'])->firstOrFail();
            $machineTypePrefix = substr(strtoupper($machine->machine_type), 0, 3);

            // Auto-generate Form Code unik
            do {
                $formCode = "FRM{$machineTypePrefix}" . strtoupper(uniqid());
            } while (Form::where('form_code', $formCode)->exists());

            // 3. Simpan Form Utama (Menggunakan instansiasi agar $form->id terjamin ada)
            $form = new Form();
            $form->machine_id        = $machine->id;
            $form->form_code         = $formCode;
            $form->form_title        = $meta['form_title'];
            $form->form_description  = $meta['form_description'] ?? '-';
            $form->frequency_type    = $meta['frequency_type'];
            $form->due_window_days   = $meta['due_window_days'];
            $form->start_date        = $meta['start_date'];
            $form->end_date          = $meta['end_date'];
            $form->is_active         = true;
            $form->save();

            // dd($form, $form->id);
            
            // 4. Looping Sections, Questions, & Options
            foreach ($validated['sections'] as $sIndex => $sectionData) {
                $sectionCode = "SEC-" . strtoupper(uniqid());

                $section = FormSection::create([
                    'form_id'             => $form->id,
                    'section_code'        => $sectionCode,
                    'section_title'       => $sectionData['section_title'],
                    'section_description' => $sectionData['section_description'] ?? '-',
                    'section_order'       => $sIndex + 1,
                ]);

                foreach ($sectionData['questions'] as $qIndex => $questionData) {
                    $questionCode = "QST-" . strtoupper(uniqid());

                    $question = FormQuestion::create([
                        'form_id'          => $form->id,
                        'form_section_id'  => $section->id,
                        'question_code'    => $questionCode,
                        'question_text'    => $questionData['question_text'],
                        'validation_rules' => $questionData['validation_rules'] ?? null,
                        'help_text'        => $questionData['help_text'] ?? null,
                        'standard_text'    => $questionData['standard_text'] ?? null,
                        'input_type'       => $questionData['input_type'],
                        'question_order'   => $qIndex + 1,
                        'is_required'      => $questionData['is_required'] ?? false,
                    ]);

                    // Simpan Options jika ada
                    if (isset($questionData['options']) && is_array($questionData['options'])) {
                        foreach ($questionData['options'] as $oIndex => $optionData) {
                            $optionCode = "OPT-" . strtoupper(uniqid());

                            $option = FormOption::create([
                                'form_question_id'     => $question->id,
                                'option_code'     => $optionCode,
                                'option_text'     => $optionData['option_text'],
                                'option_order'    => $oIndex + 1,
                                'is_normal'       => $optionData['is_normal'] ?? false,
                                'goto_form_section_id' => $optionData['goto_form_section_id'] !== '' ? $optionData['goto_form_section_id'] : null,
                            ]);
                        }
                    }
                }
            }

            // 5. AUTO-GENERATE TASKS BERDASARKAN SCHEDULE DATES (Syntax 'task_code' sudah diperbaiki)
            foreach ($request->input('schedule_dates', []) as $date) {
                Task::create([
                    'machine_id'          => $machine->id,
                    'form_id'             => $form->id,
                    'task_code'           => 'TSK-' . strtoupper(uniqid()), 
                    'due_date'            => $date,
                    'status'              => 'UPCOMING',
                    'source_type'         => null,
                    'assigned_user_id'    => null,
                    'escalation_ticket_id' => null,
                ]);
            }

            return redirect()->route('forms.index')
                ->with('success', 'Template form dan jadwal task pemantauan berhasil digenerate!');
        });
    }
}