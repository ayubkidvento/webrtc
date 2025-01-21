const socket = io("https://webrtc-0lsv.onrender.com"); // io("http://localhost:3000");
const statusTxt = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const textInput = document.getElementById("text");
const chatsContainer = document.querySelector(".chats__feeds");
let currentUserId = null; // Get assigned by the server
let pairedUser = null; // Get assigned by the server
// video calling
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
let pc;
let localStream;

function toggleButtons() {
  if (startBtn.getAttribute("disabled") == "true") {
    startBtn.removeAttribute("disabled");
    stopBtn.setAttribute("disabled", "true");
  } else {
    startBtn.setAttribute("disabled", "true");
    stopBtn.removeAttribute("disabled");
  }
}

startBtn.addEventListener("click", async () => {
  console.log("start");
  toggleButtons();
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream; // Assuming you have a <video id="localVideo"> element

    pc = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0]; // Assuming you have a <video id="remoteVideo"> element
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
  } catch (error) {
    console.error("Error starting video call:", error);
  }
});

stopBtn.addEventListener("click", () => {
  console.log("stop");
  toggleButtons();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localVideo.srcObject = null; // Clear the video element
    if (pc) {
      pc.close();
      pc = null;
    }
  }
});

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
  chatsContainer.scrollTop = chatsContainer.scrollHeight;
}

textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const val = textInput.value;
    socket.emit("message", val);
    console.log("Input value on Enter:", val);
    textInput.value = "";
  }
});

// for video calling
socket.on("offer", async (offer) => {
  if (!pc) {
    // Ensure this code runs only if you're not the caller
    pc = new RTCPeerConnection(configuration);
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream; // Display your local video
    pc.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    socket.emit("answer", answer);
  }
});
let candidateQueue = [];
socket.on("answer", async (answer) => {
  if (pc) {
    await pc.setRemoteDescription(answer);
    candidateQueue.forEach(async (candidate) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });
    candidateQueue = [];
  }
});

socket.on("candidate", async (candidate) => {
  if (pc && pc.remoteDescription) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  } else {
    candidateQueue.push(candidate);
  }
});
