export interface ValidationRules {
    expected_answer?: string;
    validation_error_message?: string;
    allowed_file_type?: string[];
    max_file_size?: '1MB' | '5MB' | '10MB' | string;
}

export interface Option {
    id: number;
    form_question_id: number;
    option_text: string;
    is_normal: boolean
    goto_form_section_id: number;
    option_order: number;
}

export interface Question {
    id: number;
    form_section_id: string;
    question_code: string;
    question_text: string;
    question_image: string;
    question_file: File | null;
    question_date: string;
    question_time: string;
    input_type: string;
    help_text: string;
    standard_text: string;
    validation_rules: ValidationRules;
    is_required: boolean;
    question_order: number;
    options: Option[];
}

export interface Section {
    id: number;
    form_id: number;
    section_code: string;
    section_title: string;
    section_description: string;
    section_order: number;
    questions: Question[];
}

export interface FormTemplate {
    form_id: string;
    form_title: string;
    form_description: string;
    sections: Section[];
}

export interface InspectionTask {
    task_id: number;
    status: string;
    schedule_date: string;
    machine: {
        machine_id: string;
        machine_name: string;
    };
    form: FormTemplate;
}

export interface InspectionsFormProps {
    tasks?: InspectionTask[];
}

