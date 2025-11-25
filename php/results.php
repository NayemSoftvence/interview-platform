<?php
require_once 'config.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // 'save' is allowed for students; admin-only actions require session
    if (in_array($action, ['get_all', 'clear_all'])) {
        if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
    }

    if ($action === 'save') {
        $student_id = $_POST['student_id'] ?? 0;
        $score = $_POST['score'] ?? 0;
        $total_questions = $_POST['total_questions'] ?? 0;
        $percentage = $_POST['percentage'] ?? 0;
        $answers = $_POST['answers'] ?? '[]';

        if (!$student_id || !$total_questions) {
            echo json_encode(['success' => false, 'message' => 'Invalid student or question data']);
            exit;
        }

        $conn = getDBConnection();

        // First, get the student's email and phone number
        $student_stmt = $conn->prepare("SELECT email, phone FROM students WHERE id = ?");
        $student_stmt->bind_param("i", $student_id);
        $student_stmt->execute();
        $student_result = $student_stmt->get_result();

        if ($student_result->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Student not found']);
            $student_stmt->close();
            $conn->close();
            exit;
        }

        $student_row = $student_result->fetch_assoc();
        $student_email = $student_row['email'];
        $student_phone = $student_row['phone'];
        $student_stmt->close();

        // Check if someone with the same email or phone already submitted results
        // This prevents the same person from submitting multiple times using different student IDs
        $check_stmt = $conn->prepare(
            "SELECT r.id FROM results r 
             JOIN students s ON r.student_id = s.id 
             WHERE (s.email = ? OR s.phone = ?) 
             LIMIT 1"
        );
        $check_stmt->bind_param("ss", $student_email, $student_phone);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows > 0) {
            // Duplicate submission detected (same email or phone)
            echo json_encode(['success' => true, 'message' => 'This email or phone number has already submitted results']);
            $check_stmt->close();
            $conn->close();
            exit;
        }
        $check_stmt->close();

        // Insert the result
        $stmt = $conn->prepare("INSERT INTO results (student_id, score, total_questions, percentage, answers) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iiids", $student_id, $score, $total_questions, $percentage, $answers);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Result saved successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save results: ' . $stmt->error]);
        }

        $stmt->close();
        $conn->close();

    } elseif ($action === 'get_all') {
        $sort_field = $_POST['sort_field'] ?? 'completion_date';
        $sort_direction = $_POST['sort_direction'] ?? 'desc';

        // Validate sort field to prevent SQL injection
        $allowed_fields = ['name', 'email', 'phone', 'score', 'percentage', 'completion_date'];
        $sort_field = in_array($sort_field, $allowed_fields) ? $sort_field : 'completion_date';
        $sort_direction = $sort_direction === 'asc' ? 'asc' : 'desc';

        $conn = getDBConnection();
        $sql = "
            SELECT s.name, s.email, s.phone, r.score, r.total_questions, r.percentage, r.completion_date 
            FROM results r 
            JOIN students s ON r.student_id = s.id 
            ORDER BY $sort_field $sort_direction
        ";

        $result = $conn->query($sql);

        $results = [];
        while ($row = $result->fetch_assoc()) {
            $results[] = $row;
        }

        echo json_encode($results);
        $conn->close();

    } elseif ($action === 'clear_all') {
        $conn = getDBConnection();

        // Start transaction
        $conn->begin_transaction();

        try {
            // Delete all results
            $stmt1 = $conn->prepare("DELETE FROM results");
            $stmt1->execute();

            // Delete all students
            $stmt2 = $conn->prepare("DELETE FROM students");
            $stmt2->execute();

            // Reset auto increment
            $conn->query("ALTER TABLE results AUTO_INCREMENT = 1");
            $conn->query("ALTER TABLE students AUTO_INCREMENT = 1");

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'All results cleared successfully']);

        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'message' => 'Error clearing results: ' . $e->getMessage()]);
        }

        $conn->close();
    }
}
?>