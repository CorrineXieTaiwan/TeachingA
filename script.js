// ⚠️ 重要：請將下面的 URL 替換成您的 Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2tdF2gu4f-uTm2fp38Hfw2Fn7MQstr9KleZtBktSmawBHW3uFtm7CYolCaVzIvKpMxw/exec';

// 檢查 URL 是否已設定
function checkScriptUrl() {
    if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        return false;
    }
    return true;
}

// 取得表單元素
const form = document.getElementById('surveyForm');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

// 當前頁面索引
let currentPage = 1;
const totalPages = 2;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updateProgressIndicator();
    showPage(1);
});

// 下一步按鈕事件
nextBtn.addEventListener('click', () => {
    if (validatePage1()) {
        showPage(2);
        updateProgressIndicator();
    }
});

// 上一步按鈕事件
prevBtn.addEventListener('click', () => {
    showPage(1);
    updateProgressIndicator();
});

// 顯示指定頁面
function showPage(pageNumber) {
    // 隱藏所有頁面
    document.querySelectorAll('.form-page').forEach(page => {
        page.classList.remove('active');
    });

    // 顯示指定頁面
    const targetPage = document.querySelector(`.form-page[data-page="${pageNumber}"]`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageNumber;
        
        // 滾動到頁面頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 更新進度指示器
function updateProgressIndicator() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        if (index + 1 <= currentPage) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// 表單提交事件處理
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 檢查 URL 是否已設定
    if (!checkScriptUrl()) {
        showMessage('錯誤：請先在 script.js 中設定 Google Apps Script Web App URL！', 'error');
        console.error('請設定 SCRIPT_URL：在 script.js 檔案中，將 YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE 替換成您的 Web App URL');
        return;
    }
    
    // 檢查必填欄位
    if (!validatePage1()) {
        showPage(1);
        updateProgressIndicator();
        showMessage('請填寫第一頁的所有必填欄位', 'error');
        return;
    }

    // 收集表單資料
    const formData = collectFormData();

    // 顯示載入狀態
    setLoadingState(true);

    try {
        // 使用 fetch API 提交資料
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(JSON.stringify(formData))}`
        });

        // 檢查回應狀態
        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showMessage('表單已成功提交！感謝您的參與。', 'success');
            form.reset();
            
            // 重置到第一頁
            showPage(1);
            updateProgressIndicator();
            
            // 3秒後隱藏成功訊息
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        } else {
            throw new Error(result.error || '提交失敗');
        }
    } catch (error) {
        console.error('提交錯誤:', error);
        
        // 根據錯誤類型顯示不同的訊息
        let errorMessage = '提交失敗：';
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
            errorMessage += '無法連接到伺服器。請確認：\n1. 已設定正確的 Google Apps Script Web App URL\n2. Web App 已正確部署\n3. 網路連線正常';
        } else if (error.message.includes('HTTP')) {
            errorMessage += error.message + '。請檢查 Google Apps Script 是否正常運作。';
        } else {
            errorMessage += error.message + '。請檢查網路連線或稍後再試。';
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        setLoadingState(false);
    }
});

// 收集表單資料
function collectFormData() {
    const data = {
        Name: document.getElementById('name').value.trim(),
        Email: document.getElementById('email').value.trim(),
        Gender: document.querySelector('input[name="gender"]:checked')?.value || '',
        Age: document.getElementById('age').value,
        transportation: getCheckboxValues('transportation'),
        Interest: getCheckboxValues('interest'),
        Feedback: document.getElementById('feedback').value.trim(),
        food: getCheckboxValues('food'),
        drink: getCheckboxValues('drink'),
        stay: getCheckboxValues('stay'),
        travel: getCheckboxValues('travel')
    };

    return data;
}

// 取得複選框的值（陣列）
function getCheckboxValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// 驗證第一頁表單
function validatePage1() {
    const requiredFields = [
        { id: 'name', message: '請輸入姓名' },
        { id: 'email', message: '請輸入 Email' },
        { id: 'age', message: '請輸入年齡' }
    ];

    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            element.focus();
            showMessage(field.message, 'error');
            return false;
        }
    }

    // 驗證 Email 格式
    const email = document.getElementById('email').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        document.getElementById('email').focus();
        showMessage('請輸入有效的 Email 地址', 'error');
        return false;
    }

    // 驗證性別是否選擇
    const genderSelected = document.querySelector('input[name="gender"]:checked');
    if (!genderSelected) {
        showMessage('請選擇性別', 'error');
        return false;
    }

    // 檢查交通方式是否至少選擇一項
    const transportationChecked = document.querySelectorAll('input[name="transportation"]:checked');
    if (transportationChecked.length === 0) {
        showMessage('請至少選擇一項交通方式', 'error');
        return false;
    }

    return true;
}

// 驗證表單（保留以備用）
function validateForm() {
    return validatePage1();
}

// 顯示訊息
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // 滾動到訊息位置
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 設定載入狀態
function setLoadingState(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// 輸入框動畫效果
const inputs = document.querySelectorAll('.input, .textarea');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// 數字輸入欄位限制
const ageInput = document.getElementById('age');
ageInput.addEventListener('input', function() {
    if (this.value < 1) {
        this.value = '';
    } else if (this.value > 120) {
        this.value = 120;
    }
});

// 頁面載入時的動畫效果
window.addEventListener('load', () => {
    const sections = document.querySelectorAll('.form-page.active .form-section');
    sections.forEach((section, index) => {
        setTimeout(() => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'all 0.5s ease-out';
            
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
});

