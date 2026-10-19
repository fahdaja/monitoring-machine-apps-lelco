<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class QrController extends Controller
{
    // Method untuk menampilkan halaman yang ada kameranya (Blade view)
    public function index()
    {
        return view('scanner'); // Mengarah ke file resources/views/scanner.blade.php
    }

    // Method untuk menerima data hasil scan QR dari JavaScript
    public function process(Request $request)
    {
        // Validasi data yang dikirim oleh frontend
        $validated = $request->validate([
            'qr_data' => 'required|string'
        ]);

        $dataAlat = $validated['qr_data'];

        // Contoh: Kamu bisa cek database, update status alat, atau simpan log.
        // Cth: Log::info("Data alat diterima: " . $dataAlat);
        // --------------------------------

        // Kirim respon balik ke frontend (JavaScript)
        return response()->json([
            'success' => true,
            'message' => 'Berhasil memproses data dari alat!',
            'data_diterima' => $dataAlat
        ]);
    }
}