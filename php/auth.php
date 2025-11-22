<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'register') {
        $name = $_POST['name'] ?? '';
        $email = $_POST['email'] ?? '';
        $phone = $_POST['phone'] ?? '';
        
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