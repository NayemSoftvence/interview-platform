<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'register') {
        $name = htmlspecialchars($_POST['name'] ?? '', ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars($_POST['phone'] ?? '', ENT_QUOTES, 'UTF-8');

        if (empty($name) || empty($email) || empty($phone)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        // Check if email or phone already exists
        $conn = getDBConnection();
        $stmt = $conn->prepare("SELECT id FROM students WHERE email = ? OR phone = ?");
        $stmt->bind_param("ss", $email, $phone);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Email or phone already registered']);
            $stmt->close();
            $conn->close();
            exit;
        }

        // Insert new student
        $stmt = $conn->prepare("INSERT INTO students (name, email, phone) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $name, $email, $phone);

        if ($stmt->execute()) {
            $student_id = $conn->insert_id;
            echo json_encode(['success' => true, 'student_id' => $student_id]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Registration failed']);
        }

        $stmt->close();
        $conn->close();
    }
}
?>