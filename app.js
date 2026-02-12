const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const questionArea = document.getElementById('questionArea');
const questionInput = document.getElementById('questionInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
const errorDiv = document.getElementById('error');
const modelSelect = document.getElementById('modelSelect');

let selectedFile = null;

// Ollama API URL
const OLLAMA_API_URL = 'http://localhost:11434/api/chat';

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
analyzeBtn.addEventListener('click', analyzeImage);
clearBtn.addEventListener('click', clearAll);

// Quick question buttons
document.querySelectorAll('.quick-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        questionInput.value = btn.dataset.question;
        questionInput.focus();
    });
});

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    if (!file.type.match('image.*')) {
        showError('Please select an image file only');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size too large. Please select a file smaller than 10MB');
        return;
    }
    
    selectedFile = file;
    
    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        questionArea.style.display = 'block';
        analyzeBtn.style.display = 'block';
        clearBtn.style.display = 'block';
        result.style.display = 'none';
        errorDiv.style.display = 'none';
        
        // Set default question if empty
        if (!questionInput.value.trim()) {
            questionInput.value = 'Describe this image in detail';
        }
    };
    reader.readAsDataURL(file);
}

async function analyzeImage() {
    if (!selectedFile) {
        showError('Please select an image first');
        return;
    }
    
    const question = questionInput.value.trim();
    if (!question) {
        showError('Please enter a question about the image');
        questionInput.focus();
        return;
    }
    
    // Show loading
    loading.style.display = 'block';
    result.style.display = 'none';
    errorDiv.style.display = 'none';
    analyzeBtn.disabled = true;
    
    try {
        // Convert image to base64
        const base64Image = await fileToBase64(selectedFile);
        
        // Call Ollama API
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelSelect.value,
                messages: [
                    {
                        role: 'user',
                        content: question,
                        images: [base64Image.split(',')[1]] // Remove data:image/... prefix
                    }
                ],
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Hide loading and show result
        loading.style.display = 'none';
        result.style.display = 'block';
        resultText.textContent = '';
        
        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message && json.message.content) {
                            fullResponse += json.message.content;
                            resultText.textContent = fullResponse;
                        }
                    } catch (e) {
                        // Skip lines that can't be parsed
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError('Error occurred: ' + error.message + '\n\nPlease check:\n1. Ollama is running at http://localhost:11434\n2. Model ' + modelSelect.value + ' is installed (ollama pull ' + modelSelect.value + ')');
    } finally {
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function clearAll() {
    if (confirm('Are you sure you want to clear everything?')) {
        selectedFile = null;
        fileInput.value = '';
        preview.style.display = 'none';
        questionArea.style.display = 'none';
        analyzeBtn.style.display = 'none';
        clearBtn.style.display = 'none';
        result.style.display = 'none';
        errorDiv.style.display = 'none';
        questionInput.value = '';
    }
}
