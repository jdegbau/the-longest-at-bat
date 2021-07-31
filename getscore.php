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