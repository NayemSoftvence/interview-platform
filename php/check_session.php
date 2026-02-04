<?php
require_once 'config.php';
session_start();

header('Content-Type: application/json');

// Check if user is logged in as admin
if (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true) {
    echo json_encode(['success' => true, 'is_admin' => true]);
} else {
    echo json_encode(['success' => false, 'is_admin' => false]);
}
?>
