export type InputType = 'NUMERIC' | 'CHOICE';

export interface Option {
    option_id: string;
    label: string;
    value: string;
    question_id: string;
    display_order: number;
}

export interface Question {
    question_id: string;
    section_id: string;
    question_code: string;
    question_text: string;
    help_text: string;
    standard_text: string;
    value: string;
    unit?: string;
    min_value?: number;
    max_value?: number;
    data_type: string;
    input_type: string;
    media_url: string;
    media_type: string;
    media_title: string;
    options: Option[];
}

export interface Section {
    section_id: string;
    section_code: string;
    section_title: string;
    section_description: string;
    questions: Question[];
}

export interface FormTemplate {
    form_id: string;
    form_name: string;
    sections: Section[];
}

export interface InspectionTask {
    task_id: string;
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

export interface SectionAnswer {
    value: string
    input_type: string;
    note: string;
    photos: File[];
}
