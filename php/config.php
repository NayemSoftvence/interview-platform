<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'zhndev_flutter_interview');
define('DB_USER', 'zhndev_flutter_interview1');
define('DB_PASS', 'i{PoP,VNfeIo0J(G');

// Create connection
function getDBConnection()
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    return $conn;
}

// Create tables if they don't exist
function createTables()
{
    $conn = getDBConnection();

    // Students table
    $sql = "CREATE TABLE IF NOT EXISTS students (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    if (!$conn->query($sql)) {
        error_log("Error creating students table: " . $conn->error);
    }

    // Questions table
    $sql = "CREATE TABLE IF NOT EXISTS questions (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        option1 VARCHAR(255) NOT NULL,
        option2 VARCHAR(255) NOT NULL,
        option3 VARCHAR(255) NOT NULL,
        option4 VARCHAR(255) NOT NULL,
        correct_answer INT(1) NOT NULL
    )";

    if (!$conn->query($sql)) {
        error_log("Error creating questions table: " . $conn->error);
    }

    // Results table
    $sql = "CREATE TABLE IF NOT EXISTS results (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id INT(6) UNSIGNED,
        score INT(3) NOT NULL,
        total_questions INT(3) NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        answers TEXT NOT NULL,
        completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )";

    if (!$conn->query($sql)) {
        error_log("Error creating results table: " . $conn->error);
    }

    $conn->close();
}

// Call this function when the application starts
createTables();

// Enable CORS for frontend-backend communication
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST , PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
?>