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
        // 添加調試資訊
        console.log('準備提交資料：', formData);
        console.log('目標 URL：', SCRIPT_URL);
        console.log('目前頁面來源：', window.location.origin);
        
        // Google Apps Script Web App 的特殊處理方式
        // 在 GitHub Pages 等外部網站上，可能會遇到 CORS 問題
        // 因此我們會先嘗試 fetch，失敗時使用表單提交方式
        
        let response;
        let useBackupMethod = false;
        
        try {
            // 方法 1：嘗試使用 fetch（標準方式）
            // 先嘗試 cors 模式，如果失敗則使用備用方法
            response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',  // 嘗試 cors 模式
                redirect: 'follow',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(JSON.stringify(formData))}`
            });
        } catch (fetchError) {
            console.error('Fetch 錯誤：', fetchError);
            console.error('錯誤類型：', fetchError.name);
            console.error('錯誤訊息：', fetchError.message);
            
            // 如果 fetch 失敗（通常是 CORS 或網路錯誤），使用備用方法
            useBackupMethod = true;
        }
        
        // 如果需要使用備用方法，或者 no-cors 模式下無法確認結果
        if (useBackupMethod) {
            console.log('使用備用表單提交方式（避免 CORS 問題）...');
            try {
                await submitViaForm(formData);
                return; // 成功提交後返回
            } catch (backupError) {
                console.error('備用方法也失敗：', backupError);
                throw backupError;
            }
        }

        // 如果可以使用 fetch 且能讀取回應，繼續處理
        try {
            // 檢查回應狀態
            if (!response.ok && response.status !== 0) {
                const errorText = await response.text();
                console.error('HTTP 錯誤回應：', errorText);
                console.error('回應狀態碼：', response.status);
                console.error('回應狀態文字：', response.statusText);
                
                // 如果是 302 重定向（Google Apps Script 常見），嘗試讀取重定向後的內容
                if (response.status === 302 || response.redirected) {
                    console.log('檢測到重定向，嘗試讀取最終回應...');
                    const finalUrl = response.url;
                    console.log('最終 URL：', finalUrl);
                }
                
                throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
            }

            // 取得回應文字
            const responseText = await response.text();
            console.log('伺服器回應：', responseText);
            
            // 嘗試解析 JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                // 如果不是 JSON，可能是 HTML 錯誤頁面
                console.error('JSON 解析錯誤：', parseError);
                console.error('回應內容（前 500 字元）：', responseText.substring(0, 500));
                
                // 檢查是否是 HTML 錯誤頁面
                if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
                    throw new Error('伺服器返回了 HTML 頁面而非 JSON。可能是 Web App 部署設定問題。請確認：1) Web App 已正確部署 2) 「具有存取權的使用者」設為「任何人」');
                }
                
                throw new Error('伺服器回應格式錯誤：' + responseText.substring(0, 100));
            }

            // 檢查結果
            if (result && result.success) {
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
                throw new Error(result.error || result.message || '提交失敗：伺服器未返回成功訊息');
            }
        } catch (responseError) {
            // 如果讀取回應時出錯，可能是 CORS 問題，嘗試使用備用方法
            console.error('讀取回應時出錯：', responseError);
            console.log('嘗試使用備用表單提交方式...');
            try {
                await submitViaForm(formData);
                return;
            } catch (backupError) {
                throw responseError; // 如果備用方法也失敗，拋出原始錯誤
            }
        }
    } catch (error) {
        console.error('提交錯誤:', error);
        console.error('錯誤名稱：', error.name);
        console.error('錯誤堆疊：', error.stack);
        
        // 根據錯誤類型顯示不同的訊息
        let errorMessage = '提交失敗：無法連接到伺服器。請確認：';
        const errorMsg = error.message || '';
        const errorName = error.name || '';
        
        if (errorMsg.includes('Failed to fetch') || 
            errorMsg.includes('fetch') || 
            errorName === 'TypeError' ||
            errorMsg.includes('network') ||
            errorMsg.includes('NetworkError')) {
            errorMessage += '\n\n1. 已設定正確的 Google Apps Script Web App URL';
            errorMessage += '\n2. Web App 已正確部署（執行身份：我，具有存取權的使用者：任何人）';
            errorMessage += '\n3. 網路連線正常';
            errorMessage += '\n\n提示：如果問題持續，請檢查瀏覽器控制台（按 F12）查看詳細錯誤';
            
            // 如果是網路錯誤，嘗試使用備用方法
            console.log('檢測到網路錯誤，嘗試使用備用表單提交方式...');
            try {
                await submitViaForm(formData);
                return;
            } catch (backupError) {
                console.error('備用方法也失敗：', backupError);
            }
        } else if (errorMsg.includes('HTTP')) {
            errorMessage = '提交失敗：' + errorMsg + '。請檢查 Google Apps Script 是否正常運作。';
        } else if (errorMsg.includes('CORS')) {
            errorMessage = '提交失敗：CORS 錯誤。請確認 Google Apps Script Web App 的部署設定允許跨域請求（「具有存取權的使用者」必須設為「任何人」）。';
        } else {
            errorMessage = '提交失敗：' + errorMsg + '。請檢查瀏覽器控制台（按 F12）以獲取詳細錯誤資訊。';
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        setLoadingState(false);
    }
});

// 備用提交方式：使用隱藏的表單提交（避免 CORS 問題）
function submitViaForm(formData) {
    return new Promise((resolve, reject) => {
        // 創建隱藏的表單
        const hiddenForm = document.createElement('form');
        hiddenForm.method = 'POST';
        hiddenForm.action = SCRIPT_URL;
        hiddenForm.target = '_blank';  // 在新視窗打開，避免頁面跳轉
        hiddenForm.style.display = 'none';
        
        // 添加資料欄位
        const dataInput = document.createElement('input');
        dataInput.type = 'hidden';
        dataInput.name = 'data';
        dataInput.value = JSON.stringify(formData);
        hiddenForm.appendChild(dataInput);
        
        // 添加到頁面並提交
        document.body.appendChild(hiddenForm);
        
        // 創建隱藏的 iframe 來接收回應
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.style.display = 'none';
        hiddenForm.target = 'hidden_iframe';
        document.body.appendChild(iframe);
        
        // 設置超時
        const timeout = setTimeout(() => {
            document.body.removeChild(hiddenForm);
            document.body.removeChild(iframe);
            reject(new Error('提交超時。請檢查網路連線。'));
        }, 10000);
        
        // 監聽 iframe 載入
        iframe.onload = () => {
            clearTimeout(timeout);
            try {
                // 嘗試讀取 iframe 內容（可能因為 CORS 無法讀取）
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const responseText = iframeDoc.body.textContent || iframeDoc.body.innerText;
                
                document.body.removeChild(hiddenForm);
                document.body.removeChild(iframe);
                
                // 假設成功（因為無法讀取回應）
                showMessage('表單已提交！請檢查 Google 試算表確認資料是否已寫入。', 'success');
                form.reset();
                showPage(1);
                updateProgressIndicator();
                resolve();
            } catch (e) {
                // 無法讀取 iframe 內容（CORS 限制）
                document.body.removeChild(hiddenForm);
                document.body.removeChild(iframe);
                showMessage('表單已提交！由於安全限制無法確認回應，請檢查 Google 試算表確認資料是否已寫入。', 'success');
                form.reset();
                showPage(1);
                updateProgressIndicator();
                resolve();
            }
        };
        
        hiddenForm.submit();
    });
}

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
    // 將換行符號轉換為 HTML 換行，並保留空白字元
    const formattedText = text.replace(/\n/g, '<br>');
    messageDiv.innerHTML = formattedText;
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

