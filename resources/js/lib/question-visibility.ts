/**
 * Dependensi antar pertanyaan dalam satu section (cermin dari
 * TaskController::hiddenConditionalQuestionIds di backend).
 *
 * Pertanyaan bertanda validation_rules[0].show_on_abnormal hanya tampil jika pertanyaan
 * pemicunya (SELECT / DROPDOWN / CHECKBOX) dijawab opsi abnormal (NG) DAN pemicu itu sendiri
 * sedang tampil. Karena itu dependensi bisa berantai: Q1 NG → Q2 tampil, Q2 NG → Q3 tampil.
 *
 * Pemicu: trigger_question_code ("order:N" atau question_code). Tanpa itu, pemicunya adalah
 * pertanyaan pilihan terdekat di atasnya.
 */

export const CHOICE_TYPES = ['SELECT', 'DROPDOWN', 'CHECKBOX'];

type AnswerGetter = (questionId: any) => { value?: any };

const truthy = (val: any): boolean =>
    val === true || val === 1 || String(val).toLowerCase() === 'true' || String(val) === '1';

export const questionRules = (q: any): any => {
    const rules = q?.validation_rules;
    if (typeof rules === 'string') {
        try {
            const parsed = JSON.parse(rules);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
            return {};
        }
    }
    return Array.isArray(rules) ? rules[0] : rules;
};

export const isConditionalQuestion = (q: any): boolean => truthy(questionRules(q)?.show_on_abnormal);

const isOptionAbnormal = (opt: any): boolean => {
    if (opt?.is_normal === undefined || opt?.is_normal === null) return false;
    const v = String(opt.is_normal).toLowerCase();
    return opt.is_normal === false || opt.is_normal === 0 || v === '0' || v === 'false';
};

const norm = (t: any) => String(t ?? '').trim().toLowerCase();

/** Apakah jawaban pertanyaan pilihan ini mengandung opsi abnormal (NG)? */
export const isAnswerAbnormal = (q: any, getAnswer: AnswerGetter): boolean => {
    const value = getAnswer(q.id)?.value;
    if (value === undefined || value === null || value === '') return false;
    const values = (Array.isArray(value) ? value : [value]).map((v) => String(v));
    return !!q.options?.some(
        (o: any) =>
            isOptionAbnormal(o) &&
            values.some((v) => v === String(o.id) || norm(v) === norm(o.option_text)),
    );
};

/** Set ID pertanyaan yang sedang tersembunyi dalam satu section. */
export function hiddenQuestionIds(questions: any[], getAnswer: AnswerGetter): Set<string> {
    const hidden = new Set<string>();
    const qs = questions || [];
    const isVisibleNg = (q: any) => !hidden.has(String(q.id)) && isAnswerAbnormal(q, getAnswer);

    qs.forEach((q, idx) => {
        if (idx === 0 || !isConditionalQuestion(q)) return;

        const code = questionRules(q)?.trigger_question_code;
        let visible: boolean;

        if (code) {
            const c = String(code);
            const trigger = c.startsWith('order:')
                ? qs[Number(c.slice(6)) - 1]
                : qs.find((item) => item.question_code === c);
            visible = !!trigger && String(trigger.id) !== String(q.id) && isVisibleNg(trigger);
        } else {
            let trigger: any = null;
            for (let i = idx - 1; i >= 0; i--) {
                if (CHOICE_TYPES.includes(String(qs[i].input_type).toUpperCase())) {
                    trigger = qs[i];
                    break;
                }
            }
            visible = trigger
                ? isVisibleNg(trigger)
                : qs.some((item) => String(item.id) !== String(q.id) && isVisibleNg(item));
        }

        if (!visible) hidden.add(String(q.id));
    });

    return hidden;
}
