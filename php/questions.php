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
        // Create array of options with their original indices
        $options = [
            ['text' => $row['option1'], 'originalIndex' => 0],
            ['text' => $row['option2'], 'originalIndex' => 1],
            ['text' => $row['option3'], 'originalIndex' => 2],
            ['text' => $row['option4'], 'originalIndex' => 3]
        ];

        // Shuffle the options for this student
        shuffle($options);

        // Find the new index of the correct answer after shuffling
        $correctAnswerOriginalIndex = (int) $row['correct_answer'] - 1;
        $newCorrectAnswerIndex = 0;
        $shuffledOptions = [];

        foreach ($options as $key => $option) {
            $shuffledOptions[] = $option['text'];
            if ($option['originalIndex'] === $correctAnswerOriginalIndex) {
                $newCorrectAnswerIndex = $key;
            }
        }

        $questions[] = [
            'id' => $row['id'],
            'question' => $row['question'],
            'options' => $shuffledOptions,
            'correctAnswer' => $newCorrectAnswerIndex
        ];
    }

    // Shuffle the questions array so each student gets a different order
    shuffle($questions);

    echo json_encode($questions);
    $conn->close();

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Try to read JSON body first, fall back to POST data
    $content_type = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $action = '';

    if (strpos($content_type, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
    } else {
        $action = $_POST['action'] ?? '';
    }

    // Require admin session for modifying actions
    if (in_array($action, ['add', 'update', 'delete', 'clear_all', 'bulk_add'])) {
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

    } elseif ($action === 'bulk_add') {
        $input = json_decode(file_get_contents('php://input'), true);
        $questions = $input['questions'] ?? [];

        if (empty($questions) || !is_array($questions)) {
            echo json_encode(['success' => false, 'message' => 'Invalid questions format']);
            exit;
        }

        $conn = getDBConnection();
        $inserted = 0;
        $errors = [];

        foreach ($questions as $q) {
            $question = $q['question'] ?? '';
            $option1 = $q['options'][0] ?? '';
            $option2 = $q['options'][1] ?? '';
            $option3 = $q['options'][2] ?? '';
            $option4 = $q['options'][3] ?? '';
            // correctAnswer is 0-based in JSON; store as 1-based in DB
            $correct_answer = (isset($q['correctAnswer']) ? intval($q['correctAnswer']) + 1 : 1);

            if (empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
                $errors[] = "Skipped invalid question: " . substr($question, 0, 50);
                continue;
            }

            $stmt = $conn->prepare("INSERT INTO questions (question, option1, option2, option3, option4, correct_answer) VALUES (?, ?, ?, ?, ?, ?)");
            if (!$stmt) {
                $errors[] = "Prepare error: " . $conn->error;
                continue;
            }

            $stmt->bind_param("sssssi", $question, $option1, $option2, $option3, $option4, $correct_answer);
            if ($stmt->execute()) {
                $inserted++;
            } else {
                $errors[] = "Failed to insert: " . substr($question, 0, 50);
            }
            $stmt->close();
        }

        $conn->close();

        if ($inserted > 0) {
            echo json_encode([
                'success' => true,
                'count' => $inserted,
                'errors' => $errors
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No questions were imported',
                'errors' => $errors
            ]);
        }

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
    } elseif ($action === 'update') {
        $id = $_POST['id'] ?? 0;
        $question = $_POST['question'] ?? '';
        $option1 = $_POST['option1'] ?? '';
        $option2 = $_POST['option2'] ?? '';
        $option3 = $_POST['option3'] ?? '';
        $option4 = $_POST['option4'] ?? '';
        $correct_answer = $_POST['correct_answer'] ?? 1;

        if (empty($id) || empty($question) || empty($option1) || empty($option2) || empty($option3) || empty($option4)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare("UPDATE questions SET question = ?, option1 = ?, option2 = ?, option3 = ?, option4 = ?, correct_answer = ? WHERE id = ?");
        $stmt->bind_param("sssssii", $question, $option1, $option2, $option3, $option4, $correct_answer, $id);

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update question']);
        }

        $stmt->close();
        $conn->close();
    }
}
?>