<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;
$n = DB::table('tasks')->whereDate('due_date', '2026-11-17')->delete();
echo "Deleted: $n\n";
