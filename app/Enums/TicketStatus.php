<?php

namespace App\Enums;

enum TicketStatus: string
{
    case OPEN = 'OPEN';
    case CLOSED = 'CLOSED';
    case IN_PROGRESS = 'IN_PROGRESS';
}