import "regenerator-runtime/runtime"; // if needed for async/await in older browsers

const chatContainer = document.getElementById("chat-container");
const messageForm = document.getElementById("message-form");
const userInput = document.getElementById("user-input");
const apiSelector = document.getElementById("api-selector");
const newChatBtn = document.getElementById("new-chat-btn");
const welcomeMessage = document.getElementById("welcome-message");

const BASE_URL = process.env.API_ENDPOINT;

let db;

// Auto-resize textarea
function autoResizeTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

userInput.addEventListener('input', autoResizeTextarea);

// Quick question handlers
const quickQuestions = {
  '월드컵 우승국': '역대 FIFA 월드컵 우승국과 우승 횟수를 알려주세요.',
  '유명 선수': '월드컵에서 활약한 유명한 선수들을 소개해주세요.',
  '최근 월드컵': '2022년 카타르 월드컵에 대한 정보를 알려주세요.'
};

document.addEventListener('click', (e) => {
  if (e.target.closest('.quick-question')) {
    const button = e.target.closest('.quick-question');
    const title = button.querySelector('h3').textContent;
    const question = quickQuestions[title];
    if (question) {
      userInput.value = question;
      messageForm.dispatchEvent(new Event('submit'));
    }
  }
});

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("worldcupChatDB", 1);
    request.onupgradeneeded = function (e) {
      db = e.target.result;
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };
    request.onsuccess = function (e) {
      db = e.target.result;
      resolve();
    };
    request.onerror = function (e) {
      reject(e);
    };
  });
}

async function saveMessage(role, content) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readwrite");
    const store = tx.objectStore("chats");
    store.add({ role, content, timestamp: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function getAllMessages() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readonly");
    const store = tx.objectStore("chats");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function saveMetadata(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readwrite");
    const store = tx.objectStore("metadata");
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function getMetadata(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = (e) => reject(e);
  });
}

async function clearAllData() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["chats", "metadata"], "readwrite");
    tx.objectStore("chats").clear();
    tx.objectStore("metadata").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function createMessageBubble(content, sender = "user") {
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-6", "flex", "items-start", "space-x-4", "animate-fade-in");

  const avatar = document.createElement("div");
  avatar.classList.add(
    "w-12",
    "h-12",
    "rounded-full",
    "flex-shrink-0",
    "flex",
    "items-center",
    "justify-center",
    "font-bold",
    "text-white",
    "shadow-lg"
  );

  if (sender === "assistant") {
    avatar.classList.add("bg-gradient-to-br", "from-green-500", "to-green-600");
    avatar.innerHTML = '<i class="fas fa-futbol"></i>';
  } else {
    avatar.classList.add("bg-gradient-to-br", "from-blue-500", "to-blue-600");
    avatar.innerHTML = '<i class="fas fa-user"></i>';
  }

  const bubble = document.createElement("div");
  bubble.classList.add(
    "max-w-full",
    "md:max-w-3xl",
    "p-4",
    "rounded-2xl",
    "whitespace-pre-wrap",
    "leading-relaxed",
    "shadow-md",
    "backdrop-blur-sm"
  );

  if (sender === "assistant") {
    bubble.classList.add("bg-white/90", "text-gray-800", "border", "border-green-100");
  } else {
    bubble.classList.add("bg-gradient-to-r", "from-blue-500", "to-blue-600", "text-white");
  }

  // Format content with markdown-like formatting
  const formattedContent = formatMessage(content);
  bubble.innerHTML = formattedContent;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  return wrapper;
}

function formatMessage(content) {
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
}

function createLoadingMessage() {
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-6", "flex", "items-start", "space-x-4", "animate-fade-in");
  wrapper.id = "loading-message";

  const avatar = document.createElement("div");
  avatar.classList.add(
    "w-12",
    "h-12",
    "rounded-full",
    "flex-shrink-0",
    "flex",
    "items-center",
    "justify-center",
    "font-bold",
    "text-white",
    "shadow-lg",
    "bg-gradient-to-br",
    "from-green-500",
    "to-green-600"
  );
  avatar.innerHTML = '<i class="fas fa-futbol"></i>';

  const bubble = document.createElement("div");
  bubble.classList.add(
    "max-w-full",
    "md:max-w-3xl",
    "p-4",
    "rounded-2xl",
    "bg-white/90",
    "text-gray-800",
    "border",
    "border-green-100",
    "shadow-md",
    "backdrop-blur-sm"
  );
  
  bubble.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
      <span class="text-gray-600">월드컵 정보를 찾고 있습니다...</span>
    </div>
  `;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  return wrapper;
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function getAssistantResponse(userMessage) {
  const allMsgs = await getAllMessages();
  const messagesForAPI = [
    { role: "system", content: "당신은 FIFA 월드컵에 대한 전문적인 정보를 제공하는 어시스턴트입니다. 월드컵의 역사, 선수, 팀, 경기 결과 등에 대해 정확하고 유용한 정보를 제공해주세요. 한국어로 답변해주세요." },
    ...allMsgs.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
  
  const payload = {
    messages: messagesForAPI,
    message: userMessage,
  };

  const url = `${BASE_URL}/chat`;

  console.log("📡 요청 URL:", url);
  console.log("📦 요청 Payload:", payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("📥 응답 Status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ 서버 응답 오류:", errorText);
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  const data = await response.json();
  console.log("✅ 파싱된 응답 데이터:", data);

  return data.reply;
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // Hide welcome message
  if (welcomeMessage) {
    welcomeMessage.style.display = 'none';
  }

  // Add user message
  chatContainer.appendChild(createMessageBubble(message, "user"));
  await saveMessage("user", message);

  // Clear input and reset height
  userInput.value = "";
  userInput.style.height = 'auto';
  scrollToBottom();

  // Add loading message
  const loadingMessage = createLoadingMessage();
  chatContainer.appendChild(loadingMessage);
  scrollToBottom();

  try {
    const response = await getAssistantResponse(message);
    
    // Remove loading message
    const loadingElement = document.getElementById("loading-message");
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // Add assistant response
    chatContainer.appendChild(createMessageBubble(response, "assistant"));
    await saveMessage("assistant", response);
    scrollToBottom();
  } catch (error) {
    console.error("Error fetching assistant response:", error);
    
    // Remove loading message
    const loadingElement = document.getElementById("loading-message");
    if (loadingElement) {
      loadingElement.remove();
    }
    
    const errMsg = "죄송합니다. 응답을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    chatContainer.appendChild(createMessageBubble(errMsg, "assistant"));
    await saveMessage("assistant", errMsg);
    scrollToBottom();
  }
});

async function loadExistingMessages() {
  const allMsgs = await getAllMessages();
  if (allMsgs.length > 0) {
    // Hide welcome message if there are existing messages
    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }
    
    for (const msg of allMsgs) {
      chatContainer.appendChild(createMessageBubble(msg.content, msg.role));
    }
    scrollToBottom();
  }
}

newChatBtn.addEventListener("click", async () => {
  // Clear DB data and UI
  await clearAllData();
  chatContainer.innerHTML = "";
  
  // Show welcome message again
  if (welcomeMessage) {
    welcomeMessage.style.display = 'block';
  }
  
  // Reset textarea
  userInput.style.height = 'auto';
});

// Initialize
initDB().then(loadExistingMessages);

console.log("월드컵 정보 어시스턴트가 시작되었습니다.");
console.log("API Endpoint:", BASE_URL); 