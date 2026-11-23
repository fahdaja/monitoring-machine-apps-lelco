<?php

namespace App\Enums;

enum MachineStatus: string
{
    case DOWN = 'DOWN';
    case RUNNING = 'RUNNING';
    case UNDER_REPAIR = 'UNDER_REPAIR';
    case WAITING_SPAREPART = 'WAITING_SPAREPART';
    case WAITING_VENDOR = 'WAITING_VENDOR';
    case WAITING_VERIFICATION = 'WAITING_VERIFICATION';
    case INACTIVE = 'INACTIVE';
}