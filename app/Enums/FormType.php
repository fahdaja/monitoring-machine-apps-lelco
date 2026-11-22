<?php

namespace App\Enums;

enum FormType: string
{
    case INSPECTION = 'INSPECTION';
    case MANUAL_REPORT = 'MANUAL_REPORT';
    case START_REPAIR = 'START_REPAIR';
    case CLOSE_TICKET = 'CLOSE_TICKET';

    /**
     * Form tidak lagi terikat ke target mesin saat pembuatan template.
     */
    public function requiresMachine(): bool
    {
        return false;
    }

    /**
     * Form transisi kanban (hasil submit masuk ke ticket_submissions).
     */
    public function isTicketTransition(): bool
    {
        return in_array($this, [self::START_REPAIR, self::CLOSE_TICKET], true);
    }

    /**
     * Keluarga "ticketing": pengisian berupa data entry murni (tanpa konsep
     * normal/abnormal & evidence). Cakup laporan breakdown, mulai repair,
     * dan tutup tiket. Hanya INSPECTION yang di luar keluarga ini.
     */
    public function isTicketing(): bool
    {
        return in_array($this, [self::MANUAL_REPORT, self::START_REPAIR, self::CLOSE_TICKET], true);
    }

    /**
     * Context yang dipakai di tabel ticket_submissions.
     */
    public function ticketContext(): ?string
    {
        return $this->isTicketTransition() ? $this->value : null;
    }

    public function label(): string
    {
        return match ($this) {
            self::INSPECTION => 'Form Inspection',
            self::MANUAL_REPORT => 'Form Laporan Breakdown',
            self::START_REPAIR => 'Form Mulai Repair',
            self::CLOSE_TICKET => 'Form Tutup Tiket',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Normalisasi nilai kategori dari query string, null bila tidak dikenal.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return self::tryFrom(strtoupper(trim($value)))?->value;
    }
}
