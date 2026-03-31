<?php
declare(strict_types=1);

require_once '/var/www/sg-portal.nirix.online/api/vendor/autoload.php';

use Google\Client;

const ALLOWED_ORIGINS = [
    'https://sg-portal.nirix.online',
    'https://5abhinavs-ops.github.io',
];

function getGoogleClient(): Client
{
    $client = new Client();
    $client->setAuthConfig('/etc/nirix-dashboard/service-account.json');
    $client->setScopes([
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
    ]);
    return $client;
}

function corsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(array $data, int $status = 200): void
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
