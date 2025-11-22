<?php
require_once 'config.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'login') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        // NOTE: For now credentials are validated here server-side.
        // Replace with a secure user store or hashed password verification.
        $ADMIN_USERNAME = 'admin';
        $ADMIN_PASSWORD = 'password123';

        if ($username === $ADMIN_USERNAME && $password === $ADMIN_PASSWORD) {
            // Mark session as admin
            $_SESSION['is_admin'] = true;
            echo json_encode(['success' => true]);
            exit;
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit;
        }
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>