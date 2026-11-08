<?php

namespace App\Enums;

enum TicketStatus: string
{
    case OPEN = 'OPEN';
    case CLOSED = 'CLOSED';
    case IN_PROGRESS = 'IN_PROGRESS';
    case WAITING_SPAREPART = 'WAITING_SPAREPART';
    case WAITING_VENDOR     = 'WAITING_VENDOR';
    case READY_FOR_CLOSING  = 'READY_FOR_CLOSING';
    case ACKNOWLEDGED       = 'ACKNOWLEDGED';
}