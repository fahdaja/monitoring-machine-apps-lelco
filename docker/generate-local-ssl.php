<?php

declare(strict_types=1);

/**
 * Generator Internal Root CA & Server SSL Certificate untuk HTTPS lokal LAN.
 *
 * Cara pakai:
 *   php docker/generate-local-ssl.php 192.168.1.198
 *   php docker/generate-local-ssl.php 192.168.1.198 cmms.lelco.local
 */

if (! extension_loaded('openssl')) {
    fwrite(STDERR, "[ERROR] Ekstensi PHP openssl tidak aktif.\n");
    exit(1);
}

$serverIp = $argv[1] ?? '192.168.1.198';
$extraDns = $argv[2] ?? '';

$certDir = __DIR__ . DIRECTORY_SEPARATOR . 'certs';
if (! is_dir($certDir) && ! mkdir($certDir, 0775, true) && ! is_dir($certDir)) {
    fwrite(STDERR, "[ERROR] Gagal membuat folder {$certDir}\n");
    exit(1);
}

$caKeyPath     = $certDir . DIRECTORY_SEPARATOR . 'lelco-root-ca.key';
$caCertPath    = $certDir . DIRECTORY_SEPARATOR . 'lelco-root-ca.crt';
$serverKeyPath = $certDir . DIRECTORY_SEPARATOR . 'server.key';
$serverCrtPath = $certDir . DIRECTORY_SEPARATOR . 'server.crt';

$tmpCaConf     = $certDir . DIRECTORY_SEPARATOR . 'ca.cnf.tmp';
$tmpServerConf = $certDir . DIRECTORY_SEPARATOR . 'server.cnf.tmp';

$cleanup = static function () use ($tmpCaConf, $tmpServerConf): void {
    @unlink($tmpCaConf);
    @unlink($tmpServerConf);
};
register_shutdown_function($cleanup);

$fail = static function (string $msg): never {
    fwrite(STDERR, "[ERROR] {$msg}\n");
    while ($err = openssl_error_string()) {
        fwrite(STDERR, "  openssl: {$err}\n");
    }
    exit(1);
};

// 1. Buat Internal Root CA (sekali saja; jika sudah ada, dipakai ulang agar device tetap trusted)
if (! is_file($caKeyPath) || ! is_file($caCertPath)) {
    echo "[1/2] Membuat Lelco Internal Root CA (berlaku 10 tahun)...\n";

    $caConfig = <<<'CFG'
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
C = ID
O = Lelco Internal
CN = Lelco Internal Root CA

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
CFG;
    file_put_contents($tmpCaConf, $caConfig);

    $caKey = openssl_pkey_new([
        'private_key_bits' => 4096,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
        'config'           => $tmpCaConf,
    ]) ?: $fail('Gagal generate private key Root CA.');

    $caCsr = openssl_csr_new(
        ['countryName' => 'ID', 'organizationName' => 'Lelco Internal', 'commonName' => 'Lelco Internal Root CA'],
        $caKey,
        ['digest_alg' => 'sha256', 'config' => $tmpCaConf]
    ) ?: $fail('Gagal membuat CSR Root CA.');

    $caCert = openssl_csr_sign(
        $caCsr,
        null,
        $caKey,
        3650,
        ['digest_alg' => 'sha256', 'config' => $tmpCaConf, 'x509_extensions' => 'v3_ca'],
        random_int(100000, 999999999)
    ) ?: $fail('Gagal menandatangani Root CA.');

    openssl_pkey_export($caKey, $caKeyPem, null, ['config' => $tmpCaConf]) ?: $fail('Gagal export key Root CA.');
    openssl_x509_export($caCert, $caCertPem) ?: $fail('Gagal export cert Root CA.');

    file_put_contents($caKeyPath, $caKeyPem);
    file_put_contents($caCertPath, $caCertPem);
} else {
    echo "[1/2] Menggunakan Lelco Internal Root CA yang sudah ada.\n";
    $caKeyPem  = file_get_contents($caKeyPath);
    $caCertPem = file_get_contents($caCertPath);
}

// 2. Buat Server SSL Certificate ditandatangani Root CA (berlaku 825 hari — batas aman Chrome/iOS)
echo "[2/2] Membuat Server SSL Certificate untuk IP {$serverIp} ...\n";

$sanLines = [
    "IP.1 = {$serverIp}",
    'IP.2 = 127.0.0.1',
    'DNS.1 = localhost',
];
if ($extraDns !== '') {
    $sanLines[] = "DNS.2 = {$extraDns}";
}
$sanBlock = implode("\n", $sanLines);

$serverConfig = <<<CFG
[req]
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
C = ID
O = Lelco Internal
CN = {$serverIp}

[v3_server]
authorityKeyIdentifier = keyid,issuer
subjectKeyIdentifier = hash
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
{$sanBlock}
CFG;
file_put_contents($tmpServerConf, $serverConfig);

$serverKey = openssl_pkey_new([
    'private_key_bits' => 2048,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
    'config'           => $tmpServerConf,
]) ?: $fail('Gagal generate private key server.');

$serverCsr = openssl_csr_new(
    ['countryName' => 'ID', 'organizationName' => 'Lelco Internal', 'commonName' => $serverIp],
    $serverKey,
    ['digest_alg' => 'sha256', 'config' => $tmpServerConf]
) ?: $fail('Gagal membuat CSR server.');

$serverCert = openssl_csr_sign(
    $serverCsr,
    $caCertPem,
    $caKeyPem,
    825,
    ['digest_alg' => 'sha256', 'config' => $tmpServerConf, 'x509_extensions' => 'v3_server'],
    random_int(100000, 999999999)
) ?: $fail('Gagal menandatangani Server Certificate dengan Root CA.');

openssl_pkey_export($serverKey, $serverKeyPem, null, ['config' => $tmpServerConf]) ?: $fail('Gagal export server key.');
openssl_x509_export($serverCert, $serverCertPem) ?: $fail('Gagal export server cert.');

file_put_contents($serverKeyPath, $serverKeyPem);
file_put_contents($serverCrtPath, $serverCertPem);

echo "\nSELESAI! Sertifikat tersimpan di: {$certDir}\n";
echo "  - Root CA (install 1x di laptop & HP): {$caCertPath}\n";
echo "  - Server Cert (dipakai Nginx Docker)  : {$serverCrtPath}\n";
echo "  - Server Key  (dipakai Nginx Docker)  : {$serverKeyPath}\n\n";
echo "Langkah selanjutnya:\n";
echo "  1. Install Root CA di laptop (PowerShell / CMD Run as Administrator):\n";
echo "     certutil -addstore -f \"ROOT\" \"{$caCertPath}\"\n";
echo "  2. Restart Docker: docker compose up -d --build\n";
echo "  3. Tutup & buka ulang browser, lalu buka https://{$serverIp}:8443\n";
