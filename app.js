const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const classifyBtn = document.getElementById('classifyBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
const errorDiv = document.getElementById('error');

let selectedFile = null;

// ตั้งค่า URL ของ Ollama API
const OLLAMA_API_URL = 'http://localhost:11434/api/chat';

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
classifyBtn.addEventListener('click', classifyImage);

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
    // ตรวจสอบประเภทไฟล์
    if (!file.type.match('image.*')) {
        showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }
    
    selectedFile = file;
    
    // แสดงตัวอย่างรูปภาพ
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        classifyBtn.style.display = 'block';
        result.style.display = 'none';
        errorDiv.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function classifyImage() {
    if (!selectedFile) {
        showError('กรุณาเลือกรูปภาพก่อน');
        return;
    }
    
    // แสดง loading
    loading.style.display = 'block';
    result.style.display = 'none';
    errorDiv.style.display = 'none';
    classifyBtn.disabled = true;
    
    try {
        // แปลงรูปภาพเป็น base64
        const base64Image = await fileToBase64(selectedFile);
        
        // เรียก Ollama API
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llava:7b',
                messages: [
                    {
                        role: 'user',
                        content: 'อธิบายรูปภาพนี้โดยละเอียดเป็นภาษาไทย',
                        images: [base64Image.split(',')[1]] // ตัด data:image/... ออก
                    }
                ],
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // แสดงผลลัพธ์
        resultText.textContent = data.message.content;
        result.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        showError('เกิดข้อผิดพลาด: ' + error.message + '\nกรุณาตรวจสอบว่า Ollama ทำงานอยู่ที่ http://localhost:11434');
    } finally {
        loading.style.display = 'none';
        classifyBtn.disabled = false;
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
