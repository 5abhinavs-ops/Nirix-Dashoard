<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

corsHeaders();

const BOAT_TECH_SPECS_SPREADSHEET_ID = '1tj-SEY7syMVY5mHhn4hYT7Ej6z_Z2pTmrSzN3wYJk4c';

try {
    $client = getGoogleClient();
    $sheets = new Google\Service\Sheets($client);

    $response = $sheets->spreadsheets_values->get(
        BOAT_TECH_SPECS_SPREADSHEET_ID,
        'Fleet Tech Spec!A:Z'
    );

    $values = $response->getValues() ?? [];
    $boatSpecs = [];

    if ($values === []) {
        jsonResponse(['ok' => true, 'data' => $boatSpecs]);
    }

    $headerRow = $values[0];
    $boatCols = [];
    for ($j = 1, $n = count($headerRow); $j < $n; $j++) {
        $name = trim((string) ($headerRow[$j] ?? ''));
        if ($name !== '') {
            $boatCols[$j] = $name;
            $boatSpecs[$name] = [];
        }
    }

    for ($i = 1, $rows = count($values); $i < $rows; $i++) {
        $row = $values[$i];
        $fieldLabel = trim((string) ($row[0] ?? ''));
        if ($fieldLabel === '') {
            continue;
        }
        foreach ($boatCols as $j => $boatName) {
            $boatSpecs[$boatName][$fieldLabel] = isset($row[$j]) ? (string) $row[$j] : '';
        }
    }

    jsonResponse(['ok' => true, 'data' => $boatSpecs]);
} catch (Throwable $e) {
    error_log('[nirix-api] ' . get_class($e) . ': ' . $e->getMessage());
    jsonResponse(['ok' => false, 'error' => 'Internal server error'], 500);
}
