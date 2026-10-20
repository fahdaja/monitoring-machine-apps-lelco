<?php

namespace App\Enums;

enum InputType : string
{
    case TEXT = 'TEXT';
    case NUMBER = 'NUMBER';
    case SELECT = 'SELECT';
    case CHECKBOX = 'CHECKBOX';
    case DROPDOWN = 'DROPDOWN';
    case TEXTAREA = 'TEXTAREA';
    case FILE = 'FILE';
    case DATE = 'DATE';
    case TIME = 'TIME';
}