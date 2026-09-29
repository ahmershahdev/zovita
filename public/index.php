<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Subfolder hosting (e.g. XAMPP at /zovita): the root .htaccess rewrites into public/,
// so present the parent folder as the script location to get the right base URL.
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
if (str_ends_with($scriptDir, '/public') && ! str_starts_with($_SERVER['REQUEST_URI'] ?? '', $scriptDir.'/')) {
    $_SERVER['SCRIPT_NAME'] = $_SERVER['PHP_SELF'] = rtrim(dirname($scriptDir), '/\\').'/index.php';
}

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
