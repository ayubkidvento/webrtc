const socket = io("https://webrtc-0lsv.onrender.com"); // io("http://localhost:3000");
const statusTxt = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const textInput = document.getElementById("text");
const chatsContainer = document.querySelector(".chats__feeds");

function toggleButtons() {
  if (startBtn.getAttribute("disabled") == "true") {
    startBtn.removeAttribute("disabled");
    stopBtn.setAttribute("disabled", "true");
  } else {
    startBtn.setAttribute("disabled", "true");
    stopBtn.removeAttribute("disabled");
  }
}

startBtn.addEventListener("click", () => {
  console.log("start");
  toggleButtons();
});

stopBtn.addEventListener("click", () => {
  console.log("stop");
  toggleButtons();
});

let currentUserId = null; // Get assigned by the server
let pairedUser = null; // Get assigned by the server

// Set username upon connecting
socket.emit("setUserName", prompt("Enter your username:"));

socket.on("connect", () => {
  currentUserId = socket.id;
  statusTxt.innerText = "Connected";
  console.log("Connected to server with ID:", socket.id);
});

// Listen for incoming messages
socket.on("message", (data) => {
  console.log("Message from server:", data);
  displayMessage(data);
});

socket.on("partnerDisconnected", (data) => {
  pairedUser = null;
  chatsContainer.innerHTML = "";
  console.log("Disconnected:", data);
  textInput.disabled = true;
  statusTxt.innerText = "Partner disconnected! Waiting for another partner...";
});

socket.on("paired", (data) => {
  pairedUser = data.partnerId;
  console.log("Paired with user ", data);
  textInput.disabled = false;
  statusTxt.innerText = `Connected with ${data.partnerUsername}`;
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  statusTxt.innerText = "Disconnected";
});

function displayMessage(message) {
  const isCurrentUser = message.senderId === currentUserId;
  const messageElement = document.createElement("div");
  // Create message text with timestamp
  const timestamp = new Date(message.datetime).toLocaleTimeString(); // Format the timestamp
  messageElement.innerHTML = `<strong>${message.sender}:</strong> ${message.text} <span class="timestamp">(${timestamp})</span>`;

  messageElement.classList.add("message"); // Add a general message class
  messageElement.classList.add(isCurrentUser ? "right" : "left");

  chatsContainer.appendChild(messageElement);
}

textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const val = textInput.value;
    socket.emit("message", val);
    console.log("Input value on Enter:", val);
    textInput.value = "";
  }
});
