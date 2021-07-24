<?php
$servername = "localhost";
$username = "foxadopt_wp37";
$password = "8]5r3pL[S7";
$dbname = "db1hwkgkg0jiwi";

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