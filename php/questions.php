<?php
require_once 'config.php';
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all questions
    $conn = getDBConnection();
    $result = $conn->query("SELECT * FROM questions ORDER BY id ASC");

    $questions = [];
    while ($row = $result->fetch_assoc()) {
        $questions[] = [
            'id' => $row['id'],
            'question' => $row['question'],
            'options' => [$row['option1'], $row['option2'], $row['option3'], $row['option4']],
            'correctAnswer' => $row['correct_answer'] - 1
        ];
    }

    echo json_encode($questions);
    $conn->close();

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Require admin session for modifying actions
    if (in_array($action, ['add', 'delete', 'clear_all'])) {
        if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
    }

    if ($action === 'add') {
        $question = $_POST['question'] ?? '';
        $option1 = $_POST['option1'] ?? '';
        $option2 = $_POST['option2'] ?? '';
        $option3 = $_POST['option3'] ?? '';
        $option4 = $_POST['option4'] ?? '';
        $correct_answer = $_POST['correct_answer'] ?? 1;

        if (empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", $question, $option1, $option2, $option3, $option4, $correct_answer);

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add question']);
        }

        $stmt->close();
        $conn->close();

    } elseif ($action === 'delete') {
        $id = $_POST['id'] ?? 0;

        $conn = getDBConnection();
        $stmt = $conn->prepare("DELETE FROM questions WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete question']);
        }

        $stmt->close();
        $conn->close();

    } elseif ($action === 'clear_all') {
        $conn = getDBConnection();
        $stmt = $conn->prepare("DELETE FROM questions");

        if ($stmt->execute()) {
            // Reset auto increment
            $conn->query("ALTER TABLE questions AUTO_INCREMENT = 1");
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to clear questions']);
        }

        $stmt->close();
        $conn->close();
    }
}
?>