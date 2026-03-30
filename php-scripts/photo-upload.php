<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

corsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method Not Allowed'], 405);
}

const FALLBACK_PHOTOS_FOLDER_ID = '1oRTw_6IbcW3N9EtvXgmU2QT5U_IFXIM-';

const BOAT_FOLDER_MAP = [
    'SG Shipping' => [
        'Galaxy'       => '1KGYT4REPrzEOO2ZG44qaWGQGoWxto2bd',
        'SG Brave'     => '1a5fuzcQ81iZg8dxROr34Vw0Z_VFATM0H',
        'SG Fortune'   => '18cIAyPMltFI33OCwbX_ApuNSeauWIutB',
        'SG Justice'   => '1JNW5N8mME3hZHiDLrF0QV6vm9W8CMORr',
        'SG Patience'  => '1uFfPqCCsC3_SD_tEB83vFon-BwXyABkV',
        'SG Loyalty'   => '1P0mDZ9UBbps1K5yzCL7di-NSdAVEzcvl',
        'SG Generous'  => '1EsFmKFF1vJ3wys8YGHI52beRnk0SNYMh',
        'SG Integrity' => '1nXP_P0OE6OjnzrN_Tj28DMfRi8cQ0_gs',
        'SG Dahlia'    => '1JRx9qsyGFdyID44EX_wNKZZPaMWxhV6_',
        'SG Sunflower' => '1saQnunawaeQ-YguWiu-djVj6heThi1oU',
        'SG Jasmine'   => '19WzkdxgB6HhGg7BJoRqwbsvNACUsvAie',
        'SG Marigold'  => '1C36rlY-XtOXlizFw6kX88BCS5Yr_quLV',
    ],
    'Sea Cabbie' => [
        'SG Ekam'   => '1q76cIEdXjo6WQM7wdM0wASn4RpUG3tyg',
        'SG Naav'   => '1HFgo8weeHZNF_sNpENsyfWJ1tFC6VfKL',
        'SG Dve'    => '1VG5hfDLCuRpcr_QQuFZy2ZHrQH0pB60P',
        'KM Golf'   => '1fpFBDZVAIjCOOS3O-7h568ZttIfn7di4',
        'SG Panch'  => '1ohvrglcKzIL1he9vXPGtPam2f9Lxq1Yy',
        'SG Chatur' => '16IqXc7ykojeMYtfReMAPiKG2OhEPIc96',
        'SG Sapta'  => '1UA0USz1GzMrmI187fsmhlwirOWm6wVnx',
        'SG Ashta'  => '1o1D1Ylb2ZCQ5jB5tCszqMmJXDdCrdcqE',
        'SG Trinee' => '1_OfcUXauVFPKiTSSrE4mXAI0-VLx15P7',
        'Vayu1'     => '1DJNwqRCfnh-OwUW_rpGDJgJ73uDDAsP0',
        'Vayu2'     => '16SM90uZLjm43safBfc1xrDQgCE5iuBqn',
    ],
];

const ALLOWED_MIME = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

function findOrCreateMonthFolder(Google\Service\Drive $drive, string $parentId): string
{
    $monthName = date('Y-m');
    $query = sprintf(
        "name = '%s' and '%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        $monthName,
        $parentId
    );
    $results = $drive->files->listFiles([
        'q' => $query,
        'fields' => 'files(id)',
        'pageSize' => 1,
        'supportsAllDrives' => true,
        'includeItemsFromAllDrives' => true,
    ]);
    $files = $results->getFiles();
    if (count($files) > 0) {
        return $files[0]->getId();
    }

    $folderMeta = new Google\Service\Drive\DriveFile([
        'name' => $monthName,
        'mimeType' => 'application/vnd.google-apps.folder',
        'parents' => [$parentId],
    ]);
    $created = $drive->files->create($folderMeta, [
        'fields' => 'id',
        'supportsAllDrives' => true,
    ]);
    return $created->getId();
}

try {
    if (!isset($_FILES['photo']) || !is_array($_FILES['photo'])) {
        jsonResponse(['ok' => false, 'error' => 'Missing photo field'], 400);
    }

    $err = (int) ($_FILES['photo']['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
        jsonResponse(['ok' => false, 'error' => 'Upload failed (code ' . $err . ')'], 400);
    }

    $tmp = (string) ($_FILES['photo']['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        jsonResponse(['ok' => false, 'error' => 'Invalid upload'], 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    if ($mime === false || !in_array($mime, ALLOWED_MIME, true)) {
        jsonResponse(['ok' => false, 'error' => 'File must be jpeg, png, gif, or webp'], 400);
    }

    if (@getimagesize($tmp) === false) {
        jsonResponse(['ok' => false, 'error' => 'Not a valid image'], 400);
    }

    $originalName = (string) ($_FILES['photo']['name'] ?? 'photo.jpg');
    $originalName = preg_replace('/[^-_.a-zA-Z0-9]/', '_', $originalName) ?: 'photo.jpg';

    $content = file_get_contents($tmp);
    if ($content === false) {
        jsonResponse(['ok' => false, 'error' => 'Could not read upload'], 500);
    }

    $boat = trim((string) ($_POST['boat'] ?? ''));
    $company = trim((string) ($_POST['company'] ?? ''));

    $client = getGoogleClient();
    $drive = new Google\Service\Drive($client);

    $targetFolder = FALLBACK_PHOTOS_FOLDER_ID;
    if ($company !== '' && $boat !== '' && isset(BOAT_FOLDER_MAP[$company][$boat])) {
        $boatFolderId = BOAT_FOLDER_MAP[$company][$boat];
        $targetFolder = findOrCreateMonthFolder($drive, $boatFolderId);
    }

    $fileMeta = new Google\Service\Drive\DriveFile([
        'name' => $originalName,
        'parents' => [$targetFolder],
    ]);

    $created = $drive->files->create($fileMeta, [
        'data' => $content,
        'mimeType' => $mime,
        'uploadType' => 'multipart',
        'fields' => 'id',
        'supportsAllDrives' => true,
    ]);

    $fileId = $created->getId();
    if ($fileId === null || $fileId === '') {
        jsonResponse(['ok' => false, 'error' => 'Drive did not return file id'], 500);
    }

    $permission = new Google\Service\Drive\Permission([
        'type' => 'anyone',
        'role' => 'reader',
    ]);
    $drive->permissions->create($fileId, $permission, ['fields' => 'id']);

    $thumbUrl = 'https://drive.google.com/thumbnail?id=' . $fileId . '&sz=w800';

    jsonResponse([
        'ok' => true,
        'url' => $thumbUrl,
        'fileId' => $fileId,
    ]);
} catch (Throwable $e) {
    error_log('[nirix-api] ' . get_class($e) . ': ' . $e->getMessage()); jsonResponse(['ok' => false, 'error' => 'Internal server error'], 500);
}
