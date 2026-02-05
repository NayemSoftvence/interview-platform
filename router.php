<?php
/**
 * Router for PHP built-in server
 * Usage: php -S localhost:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Special case for /admin
if ($uri === '/admin') {
    include 'admin.html';
    exit;
}

// Redirect /admin/ to /admin
if ($uri === '/admin/') {
    header('Location: /admin');
    exit;
}

// If file exists, serve it as is
if (file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

// Default to index.html for root or unknown paths
if ($uri === '/' || $uri === '') {
    include 'index.html';
    exit;
}

// Fallback to index.html for other paths (SPA style)
if (!preg_match('/\.(?:png|jpg|jpeg|gif|css|js|json|php)$/', $uri)) {
    include 'index.html';
    exit;
}

return false;
?>
