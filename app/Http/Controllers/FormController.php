<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Form; // Sesuaikan dengan namespace Model Anda jika ada
use App\Models\Machine;

class FormController extends Controller
{
    /**
     * Tampilkan halaman list semua form yang sudah dibuat.
     */
    public function index()
    {
        $forms = Form::with('sections', 'questions', 'options')->latest()->get();
        
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
     * Simpan form baru beserta sections & questions-nya ke DB.
     */
    public function store(Request $request)
    {
        // 1. Validasi input yang dikirim dari Frontend Inertia form builder
        $validated = $request->validate([
            'form_title'              => 'required|string|max:255',
            'machine_id'              => 'required|string',
            'description'             => 'nullable|string',
            'sections'                => 'required|array|min:1',
            'sections.*.section_title'       => 'required|string|max:255',
            'sections.*.section_description' => 'nullable|string',
            'sections.*.questions'           => 'array',
            'sections.*.questions.*.question_text' => 'required|string',
            'sections.*.questions.*.input_type'    => 'required|string',
            'sections.*.questions.*.unit'          => 'nullable|string',
            'sections.*.questions.*.min_value'     => 'nullable',
            'sections.*.questions.*.max_value'     => 'nullable',
            'sections.*.questions.*.is_required'   => 'boolean',
            'sections.*.questions.*.help_text'     => 'nullable|string',
            'sections.*.questions.*.standard_text' => 'nullable|string',
            'sections.*.questions.*.options'       => 'nullable|array',
        ]);

        // 2. Gunakan DB Transaction agar aman (jika gagal di tengah, data tidak setengah-setengah tersimpan)
        DB::transaction(function () use ($validated) {
            
            // Simpan data utama Form (Pastikan machine_id ikut dimasukkan di sini)
            $form = Form::create([
                'form_id'     => 'FORM-' . strtoupper(uniqid()), // Generator ID unik sementara
                'form_name'   => $validated['form_title'],
                'machine_id'  => $validated['machine_id'], // <--- Menjawab error sebelumnya
                'description' => $validated['description'] ?? null,
                'is_active'   => true,
            ]);

            // Jika Anda memiliki relasi Section dan Question di Eloquent, Anda bisa menyimpannya secara looping:
            /*
            foreach ($validated['sections'] as $secData) {
                $section = $form->sections()->create([
                    'section_title' => $secData['section_title'],
                    'section_description' => $secData['section_description'] ?? null,
                ]);

                foreach ($secData['questions'] as $qData) {
                    $section->questions()->create([
                        'question_text' => $qData['question_text'],
                        'input_type'    => $qData['input_type'],
                        'unit'          => $qData['unit'] ?? null,
                        'min_value'     => $qData['min_value'] ?? null,
                        'max_value'     => $qData['max_value'] ?? null,
                        'is_required'   => $qData['is_required'] ?? true,
                        'help_text'     => $qData['help_text'] ?? null,
                        'standard_text' => $qData['standard_text'] ?? null,
                        'options'       => json_encode($qData['options'] ?? []),
                    ]);
                }
            }
            */
        });

        return redirect()->route('forms.index')
            ->with('success', 'Template form pemantauan berhasil disimpan!');
    }
}