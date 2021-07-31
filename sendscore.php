<?php
$servername = "localhost";
$username = "${{ secrets.dbuser }}";
$password = "${{ secrets.dbpass }}";
$dbname = "${{ secrets.dbname }}";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
} 

$sql = "INSERT INTO high_scores (score)
VALUES (" . $_GET['pitches'] . ")";

if ($conn->query($sql) === TRUE) {
  echo "New record created successfully";
} else {
  echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
?>