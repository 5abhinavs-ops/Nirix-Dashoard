<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

corsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(['ok' => false, 'error' => 'Method Not Allowed'], 405);
}

const SPREADSHEET_ID = '1qul0ee5Ioh526zXw-dXBakCMFZk3emJhM6lRdM6pEKA';
const ALLOWED_SHEETS = ['Sheet1', 'EngineSpecs'];

try {
    $sheet = $_GET['sheet'] ?? '';
    if ($sheet === '' || !in_array($sheet, ALLOWED_SHEETS, true)) {
        jsonResponse(['ok' => false, 'error' => 'Invalid sheet parameter. Allowed: Sheet1, EngineSpecs'], 400);
    }

    $client = getGoogleClient();
    $service = new Google\Service\Sheets($client);

    $range = $sheet;
    $response = $service->spreadsheets_values->get(SPREADSHEET_ID, $range);
    $values = $response->getValues() ?? [];

    jsonResponse(['ok' => true, 'values' => $values]);
} catch (Throwable $e) {
    error_log('[nirix-api] sheets-proxy: ' . get_class($e) . ': ' . $e->getMessage());
    jsonResponse(['ok' => false, 'error' => 'Internal server error'], 500);
}
