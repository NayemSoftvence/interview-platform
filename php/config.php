<?php
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Database configuration
define('DB_HOST', $_ENV['DB_HOST']);
define('DB_NAME', $_ENV['DB_NAME']);
define('DB_USER', $_ENV['DB_USER']);
define('DB_PASS', $_ENV['DB_PASS']);

// Enable error reporting for debugging
mysqli_report(MYSQLI_REPORT_OFF);

/**
 * A simple wrapper to make SQLite3 behave like mysqli for basic operations
 */
class SQLiteCompatiblemysqli_stmt {
    private $stmt;
    private $db;
    public $error;
    
    public function __construct($stmt, $db = null) {
        $this->stmt = $stmt;
        $this->db = $db;
    }
    
    public function bind_param($types, ...$params) {
        foreach ($params as $i => $param) {
            $this->stmt->bindValue($i + 1, $param);
        }
        return true;
    }
    
    public function execute() {
        $res = $this->stmt->execute();
        if ($res === false) {
            $this->error = "Execute failed";
            return false;
        }
        // Update parent connection's insert_id
        if ($this->db) {
            $this->db->setInsertId($this->db->lastInsertRowID());
        }
        return true;
    }
    
    public function get_result() {
        $res = $this->stmt->execute();
        if ($res === false) {
            $this->error = "Get result failed";
            return false;
        }
        // Update parent connection's insert_id
        if ($this->db) {
            $this->db->setInsertId($this->db->lastInsertRowID());
        }
        return new SQLiteCompatiblemysqli_result($res);
    }
    
    public function close() {
        return @$this->stmt->close();
    }
}

class SQLiteCompatiblemysqli_result {
    private $result;
    private $rows = null;
    private $pointer = 0;
    public $num_rows = 0;
    
    public function __construct($result) {
        $this->result = $result;
        if ($result) {
            $this->rows = [];
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                $this->rows[] = $row;
            }
            $this->num_rows = count($this->rows);
        }
    }
    
    public function fetch_assoc() {
        if ($this->rows === null || $this->pointer >= $this->num_rows) {
            return null;
        }
        return $this->rows[$this->pointer++];
    }
}

class SQLiteCompatiblemysqli {
    private $db;
    public $insert_id;
    public $error;
    public $connect_error;

    public function __construct($path) {
        try {
            $this->db = new SQLite3($path);
            $this->insert_id = null;
        } catch (Exception $e) {
            $this->connect_error = $e->getMessage();
        }
    }

    public function query($sql) {
        $res = @$this->db->query($sql);
        if ($res === false) {
            $this->error = $this->db->lastErrorMsg();
            return false;
        }
        return new SQLiteCompatiblemysqli_result($res);
    }

    public function prepare($sql) {
        try {
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                $this->error = $this->db->lastErrorMsg();
                return false;
            }
            return new SQLiteCompatiblemysqli_stmt($stmt, $this);
        } catch (Exception $e) {
            $this->error = $e->getMessage();
            return false;
        }
    }

    public function close() {
        return $this->db->close();
    }
    
    public function begin_transaction() { $this->db->exec('BEGIN TRANSACTION'); }
    public function commit() { $this->db->exec('COMMIT'); }
    public function rollback() { $this->db->exec('ROLLBACK'); }
    
    public function lastInsertRowID() {
        return $this->db->lastInsertRowID();
    }
    
    public function setInsertId($id) {
        $this->insert_id = $id;
    }

    public function __get($name) {
        if ($name === 'insert_id') return $this->insert_id;
        return null;
    }
}

// Create connection
function getDBConnection()
{
    // Determine engine based on APP_ENV first, then DB_ENGINE
    $app_env = $_ENV['APP_ENV'] ?? 'live';
    $engine = $_ENV['DB_ENGINE'] ?? ($app_env === 'dev' ? 'sqlite' : 'mysql');

    if ($engine === 'sqlite') {
        $db_path = __DIR__ . '/../database.sqlite';
        return new SQLiteCompatiblemysqli($db_path);
    }

    // Default to MySQL
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            error_log("MySQL Connection failed: " . $conn->connect_error);
            return null;
        }
        return $conn;
    } catch (Exception $e) {
        error_log("MySQL Connection Exception: " . $e->getMessage());
        return null;
    }
}

// Create tables if they don't exist
function createTables()
{
    $conn = getDBConnection();
    if (!$conn) return;

    $engine = $_ENV['DB_ENGINE'] ?? 'mysql';

    // Helper to normalize SQL for SQLite
    $normalize = function($sql) use ($engine) {
        if ($engine === 'sqlite') {
            $sql = str_replace('AUTO_INCREMENT', 'AUTOINCREMENT', $sql);
            $sql = str_replace('UNSIGNED', '', $sql);
            $sql = preg_replace('/INT\(\d+\)/', 'INTEGER', $sql);
            $sql = str_replace('TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'DATETIME DEFAULT CURRENT_TIMESTAMP', $sql);
            // Remove foreign keys if troubleshooting in SQLite or just let them be if supported
        }
        return $sql;
    };

    // Students table
    $sql = $normalize("CREATE TABLE IF NOT EXISTS students (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $conn->query($sql);

    // Questions table
    $sql = $normalize("CREATE TABLE IF NOT EXISTS questions (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        option1 VARCHAR(255) NOT NULL,
        option2 VARCHAR(255) NOT NULL,
        option3 VARCHAR(255) NOT NULL,
        option4 VARCHAR(255) NOT NULL,
        correct_answer INT(1) NOT NULL
    )");
    $conn->query($sql);

    // Results table
    $sql = $normalize("CREATE TABLE IF NOT EXISTS results (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id INT(6) UNSIGNED,
        score INT(3) NOT NULL,
        total_questions INT(3) NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        answers TEXT NOT NULL,
        completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )");
    $conn->query($sql);

    // Settings table
    $sql = $normalize("CREATE TABLE IF NOT EXISTS settings (
        id INT(1) PRIMARY KEY DEFAULT 1,
        interview_time_minutes INT(3) NOT NULL DEFAULT 30,
        exam_status BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    $conn->query($sql);

    $conn->close();
}

// Call this function when the application starts
if (PHP_SAPI !== 'cli') {
    createTables();
}
?>