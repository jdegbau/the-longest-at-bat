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

$sql = "SELECT score, timestamp FROM high_scores ORDER BY score DESC, timestamp DESC LIMIT 1";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
  // output data of each row
  while($row = $result->fetch_assoc()) {
    echo $row["score"];
  }
} else {
  echo "0";
}
$conn->close();
?>