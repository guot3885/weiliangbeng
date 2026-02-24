// Cordova设备就绪事件
document.addEventListener('deviceready', onDeviceReady, false);

// 全局变量
let currentCalculationType = 'rate'; // 'rate' 或 'concentration'
let currentPage = 'home'; // 'home', 'favorites', 'tools', 'about'
let calculationHistory = [];
let favorites = [];
let currentResult = null;
let settings = {
    theme: 'light',
    defaultWeight: '',
    defaultDilution: '50'
};

// 药物数据库
const drugDatabase = {
    dopamine: {
        name: '多巴胺',
        unit: 'μg/kg/min',
        defaultDose: '5',
        minDose: '2',
        maxDose: '20',
        description: '用于治疗休克综合征'
    },
    dobutamine: {
        name: '多巴酚丁胺',
        unit: 'μg/kg/min',
        defaultDose: '5',
        minDose: '2',
        maxDose: '20',
        description: '用于治疗心力衰竭'
    },
    norepinephrine: {
        name: '去甲肾上腺素',
        unit: 'μg/kg/min',
        defaultDose: '0.1',
        minDose: '0.05',
        maxDose: '0.5',
        description: '用于治疗严重低血压'
    },
    epinephrine: {
        name: '肾上腺素',
        unit: 'μg/kg/min',
        defaultDose: '0.05',
        minDose: '0.01',
        maxDose: '0.1',
        description: '用于治疗过敏性休克'
    },
    isoproterenol: {
        name: '异丙肾上腺素',
        unit: 'μg/kg/min',
        defaultDose: '0.05',
        minDose: '0.01',
        maxDose: '0.1',
        description: '用于治疗心动过缓'
    },
    phenylephrine: {
        name: '去氧肾上腺素',
        unit: 'μg/kg/min',
        defaultDose: '0.5',
        minDose: '0.1',
        maxDose: '2',
        description: '用于治疗低血压'
    },
    vasopressin: {
        name: '血管加压素',
        unit: 'mU/kg/min',
        defaultDose: '0.04',
        minDose: '0.01',
        maxDose: '0.08',
        description: '用于治疗血管扩张性休克'
    }
};

// 设备就绪回调
function onDeviceReady() {
    console.log('设备就绪');
    
    // 初始化应用
    initApp();
    
    // 设置返回键处理
    document.addEventListener('backbutton', onBackButton, false);
    
    // 请求必要的权限
    requestPermissions();
    
    // 隐藏加载指示器
    setTimeout(() => {
        document.getElementById('loading-indicator').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }, 1000);
}

// 初始化应用
function initApp() {
    // 加载设置
    loadSettings();
    
    // 加载历史记录
    loadHistory();
    
    // 加载收藏
    loadFavorites();
    
    // 应用主题
    applyTheme(settings.theme);
    
    // 设置事件监听器
    setupEventListeners();
    
    // 填充药物选择下拉框
    populateDrugSelect();
    
    // 应用默认设置
    applyDefaultSettings();
}

// 请求权限
function requestPermissions() {
    // 检查是否有权限插件
    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.permissions) {
        const permissions = cordova.plugins.permissions;
        
        // 请求存储权限
        permissions.requestPermissions(
            [permissions.WRITE_EXTERNAL_STORAGE, permissions.READ_EXTERNAL_STORAGE],
            (status) => {
                if (status.hasPermission) {
                    console.log('已获得存储权限');
                } else {
                    console.log('未获得存储权限');
                    showAlert('需要存储权限以保存和导入数据');
                }
            },
            (error) => {
                console.error('请求权限失败:', error);
            }
        );
    }
}

// 返回键处理
function onBackButton(e) {
    // 根据当前页面决定行为
    if (currentPage !== 'home') {
        // 如果不在主页，返回主页
        showPage('home');
    } else if (isModalOpen()) {
        // 如果有模态框打开，关闭模态框
        closeAllModals();
    } else {
        // 如果在主页且没有模态框，询问是否退出应用
        navigator.notification.confirm(
            '确定要退出应用吗？',
            (buttonIndex) => {
                if (buttonIndex === 1) { // 确定按钮
                    navigator.app.exitApp();
                }
            },
            '退出应用',
            ['确定', '取消']
        );
    }
    
    // 阻止默认行为
    e.preventDefault();
    return false;
}

// 检查是否有模态框打开
function isModalOpen() {
    const modals = document.querySelectorAll('#history-modal, #settings-modal');
    for (let modal of modals) {
        if (!modal.classList.contains('hidden')) {
            return true;
        }
    }
    return false;
}

// 关闭所有模态框
function closeAllModals() {
    const modals = document.querySelectorAll('#history-modal, #settings-modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 计算类型切换
    document.getElementById('type-rate').addEventListener('click', () => switchCalculationType('rate'));
    document.getElementById('type-concentration').addEventListener('click', () => switchCalculationType('concentration'));
    
    // 计算按钮
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    
    // 药物选择
    document.getElementById('drug').addEventListener('change', handleDrugChange);
    
    // 历史记录按钮
    document.getElementById('history-btn').addEventListener('click', toggleHistoryModal);
    document.getElementById('close-history-btn').addEventListener('click', toggleHistoryModal);
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
    
    // 设置按钮
    document.getElementById('settings-btn').addEventListener('click', toggleSettingsModal);
    document.getElementById('close-settings-btn').addEventListener('click', toggleSettingsModal);
    
    // 主题切换
    document.getElementById('theme-light').addEventListener('click', () => changeTheme('light'));
    document.getElementById('theme-dark').addEventListener('click', () => changeTheme('dark'));
    
    // 数据导入导出
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', importData);
    
    // 保存和分享按钮
    document.getElementById('save-btn').addEventListener('click', saveToHistory);
    document.getElementById('share-btn').addEventListener('click', shareResult);
    
    // 底部导航按钮
    document.getElementById('home-btn').addEventListener('click', () => showPage('home'));
    document.getElementById('favorites-btn').addEventListener('click', () => showPage('favorites'));
    document.getElementById('tools-btn').addEventListener('click', () => showPage('tools'));
    document.getElementById('about-btn').addEventListener('click', () => showPage('about'));
    
    // 返回按钮
    document.getElementById('back-from-favorites-btn').addEventListener('click', () => showPage('home'));
    document.getElementById('back-from-tools-btn').addEventListener('click', () => showPage('home'));
    document.getElementById('back-from-about-btn').addEventListener('click', () => showPage('home'));
    
    // 工具页面按钮
    document.querySelectorAll('#tools-page button').forEach(button => {
        button.addEventListener('click', () => {
            const toolName = button.querySelector('span').textContent;
            showToast(`功能开发中: ${toolName}`);
        });
    });
}

// 填充药物选择下拉框
function populateDrugSelect() {
    const select = document.getElementById('drug');
    select.innerHTML = '<option value="">请选择药物</option>';
    
    // 添加预设药物
    Object.keys(drugDatabase).forEach(key => {
        const drug = drugDatabase[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = drug.name;
        select.appendChild(option);
    });
    
    // 添加自定义药物选项
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = '自定义药物';
    select.appendChild(customOption);
}

// 应用默认设置
function applyDefaultSettings() {
    // 设置默认体重
    if (settings.defaultWeight) {
        document.getElementById('weight').value = settings.defaultWeight;
    }
    
    // 设置默认稀释液量
    document.getElementById('dilution').value = settings.defaultDilution;
    document.getElementById('dilution-conc').value = settings.defaultDilution;
}

// 切换计算类型
function switchCalculationType(type) {
    currentCalculationType = type;
    
    // 更新UI
    if (type === 'rate') {
        document.getElementById('type-rate').classList.add('bg-blue-600', 'text-white');
        document.getElementById('type-rate').classList.remove('bg-white', 'text-gray-700');
        document.getElementById('type-concentration').classList.add('bg-white', 'text-gray-700');
        document.getElementById('type-concentration').classList.remove('bg-blue-600', 'text-white');
        
        document.getElementById('rate-form').classList.remove('hidden');
        document.getElementById('concentration-form').classList.add('hidden');
    } else {
        document.getElementById('type-concentration').classList.add('bg-blue-600', 'text-white');
        document.getElementById('type-concentration').classList.remove('bg-white', 'text-gray-700');
        document.getElementById('type-rate').classList.add('bg-white', 'text-gray-700');
        document.getElementById('type-rate').classList.remove('bg-blue-600', 'text-white');
        
        document.getElementById('concentration-form').classList.remove('hidden');
        document.getElementById('rate-form').classList.add('hidden');
    }
    
    // 隐藏结果
    document.getElementById('result-container').classList.add('hidden');
}

// 处理药物选择变化
function handleDrugChange() {
    const drugSelect = document.getElementById('drug');
    const selectedDrug = drugSelect.value;
    const customDrugContainer = document.getElementById('custom-drug-container');
    
    // 显示或隐藏自定义药物输入框
    if (selectedDrug === 'custom') {
        customDrugContainer.classList.remove('hidden');
    } else {
        customDrugContainer.classList.add('hidden');
    }
    
    // 如果选择了预设药物，填充默认值
    if (selectedDrug && selectedDrug !== 'custom') {
        const drug = drugDatabase[selectedDrug];
        if (drug && drug.defaultDose) {
            document.getElementById('dose').value = drug.defaultDose;
        }
    }
    
    // 隐藏结果
    document.getElementById('result-container').classList.add('hidden');
}

// 计算函数
function calculate() {
    // 获取输入值
    const drugSelect = document.getElementById('drug').value;
    const customDrug = document.getElementById('custom-drug').value;
    const weight = parseFloat(document.getElementById('weight').value);
    
    // 验证基本输入
    if (!weight || weight <= 0) {
        showAlert('请输入有效的体重');
        return;
    }
    
    let result = null;
    let drugName = '';
    
    // 根据计算类型执行不同的计算
    if (currentCalculationType === 'rate') {
        // 速度计算
        const dose = parseFloat(document.getElementById('dose').value);
        const totalDrug = parseFloat(document.getElementById('total-drug').value);
        const dilution = parseFloat(document.getElementById('dilution').value);
        
        // 验证输入
        if (!dose || dose <= 0) {
            showAlert('请输入有效的药物剂量');
            return;
        }
        
        if (!totalDrug || totalDrug <= 0) {
            showAlert('请输入有效的药物总量');
            return;
        }
        
        if (!dilution || dilution <= 0) {
            showAlert('请输入有效的稀释液量');
            return;
        }
        
        // 获取药物名称
        if (drugSelect === 'custom') {
            if (!customDrug) {
                showAlert('请输入自定义药物名称');
                return;
            }
            drugName = customDrug;
        } else if (drugSelect) {
            drugName = drugDatabase[drugSelect].name;
        } else {
            showAlert('请选择或输入药物名称');
            return;
        }
        
        // 计算泵速 (ml/h)
        // 公式: 泵速(ml/h) = (剂量(μg/kg/min) × 体重(kg) × 60) / (药物总量(mg) × 1000 / 稀释液量(ml))
        const rate = (dose * weight * 60) / (totalDrug * 1000 / dilution);
        
        // 创建结果对象
        result = {
            type: 'rate',
            drug: drugName,
            weight: weight,
            dose: dose,
            totalDrug: totalDrug,
            dilution: dilution,
            rate: rate.toFixed(2),
            unit: drugSelect && drugSelect !== 'custom' ? drugDatabase[drugSelect].unit : 'μg/kg/min',
            timestamp: new Date().toISOString()
        };
    } else {
        // 浓度计算
        const rate = parseFloat(document.getElementById('rate').value);
        const totalDrug = parseFloat(document.getElementById('total-drug-conc').value);
        const dilution = parseFloat(document.getElementById('dilution-conc').value);
        
        // 验证输入
        if (!rate || rate <= 0) {
            showAlert('请输入有效的泵速');
            return;
        }
        
        if (!totalDrug || totalDrug <= 0) {
            showAlert('请输入有效的药物总量');
            return;
        }
        
        if (!dilution || dilution <= 0) {
            showAlert('请输入有效的稀释液量');
            return;
        }
        
        // 获取药物名称
        if (drugSelect === 'custom') {
            if (!customDrug) {
                showAlert('请输入自定义药物名称');
                return;
            }
            drugName = customDrug;
        } else if (drugSelect) {
            drugName = drugDatabase[drugSelect].name;
        } else {
            showAlert('请选择或输入药物名称');
            return;
        }
        
        // 计算药物浓度 (μg/kg/min)
        // 公式: 浓度(μg/kg/min) = (泵速(ml/h) × 药物总量(mg) × 1000 / 稀释液量(ml)) / (体重(kg) × 60)
        const concentration = (rate * totalDrug * 1000 / dilution) / (weight * 60);
        
        // 创建结果对象
        result = {
            type: 'concentration',
            drug: drugName,
            weight: weight,
            rate: rate,
            totalDrug: totalDrug,
            dilution: dilution,
            concentration: concentration.toFixed(3),
            unit: drugSelect && drugSelect !== 'custom' ? drugDatabase[drugSelect].unit : 'μg/kg/min',
            timestamp: new Date().toISOString()
        };
    }
    
    // 保存当前结果
    currentResult = result;
    
    // 显示结果
    displayResult(result);
}

// 显示计算结果
function displayResult(result) {
    const resultContent = document.getElementById('result-content');
    resultContent.innerHTML = '';
    
    // 创建结果卡片
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card fade-in';
    
    // 根据计算类型显示不同的结果
    if (result.type === 'rate') {
        resultCard.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-bold text-blue-700 mb-2">${result.drug}</h3>
                <p class="text-gray-600 text-sm">体重: ${result.weight} kg | 剂量: ${result.dose} ${result.unit}</p>
                <p class="text-gray-600 text-sm">药物总量: ${result.totalDrug} mg | 稀释液量: ${result.dilution} ml</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg">
                <div class="flex items-center justify-between">
                    <span class="text-gray-700">泵入速度</span>
                    <span class="text-3xl font-bold text-blue-600">${result.rate}</span>
                </div>
                <div class="text-right text-gray-500 mt-1">ml/h</div>
            </div>
        `;
    } else {
        resultCard.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-bold text-blue-700 mb-2">${result.drug}</h3>
                <p class="text-gray-600 text-sm">体重: ${result.weight} kg | 泵速: ${result.rate} ml/h</p>
                <p class="text-gray-600 text-sm">药物总量: ${result.totalDrug} mg | 稀释液量: ${result.dilution} ml</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg">
                <div class="flex items-center justify-between">
                    <span class="text-gray-700">药物浓度</span>
                    <span class="text-3xl font-bold text-blue-600">${result.concentration}</span>
                </div>
                <div class="text-right text-gray-500 mt-1">${result.unit}</div>
            </div>
        `;
    }
    
    // 添加到结果容器
    resultContent.appendChild(resultCard);
    
    // 显示结果容器
    document.getElementById('result-container').classList.remove('hidden');
    
    // 滚动到结果
    document.getElementById('result-container').scrollIntoView({ behavior: 'smooth' });
}

// 保存到历史记录
function saveToHistory() {
    if (!currentResult) return;
    
    // 添加到历史记录
    calculationHistory.unshift(currentResult);
    
    // 限制历史记录数量
    if (calculationHistory.length > 50) {
        calculationHistory = calculationHistory.slice(0, 50);
    }
    
    // 保存到本地存储
    saveHistory();
    
    // 显示提示
    showToast('已保存到历史记录');
}

// 分享结果
function shareResult() {
    if (!currentResult) return;
    
    // 构建分享文本
    let shareText = '';
    
    if (currentResult.type === 'rate') {
        shareText = `医学微量泵计算结果：
药物：${currentResult.drug}
体重：${currentResult.weight} kg
剂量：${currentResult.dose} ${currentResult.unit}
药物总量：${currentResult.totalDrug} mg
稀释液量：${currentResult.dilution} ml
计算结果：泵入速度 ${currentResult.rate} ml/h

计算时间：${formatDateTime(currentResult.timestamp)}`;
    } else {
        shareText = `医学微量泵计算结果：
药物：${currentResult.drug}
体重：${currentResult.weight} kg
泵速：${currentResult.rate} ml/h
药物总量：${currentResult.totalDrug} mg
稀释液量：${currentResult.dilution} ml
计算结果：药物浓度 ${currentResult.concentration} ${currentResult.unit}

计算时间：${formatDateTime(currentResult.timestamp)}`;
    }
    
    // 检查是否有分享插件
    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.sharing) {
        // 使用Cordova分享插件
        cordova.plugins.sharing.shareText(
            shareText,
            '医学微量泵计算结果',
            (success) => {
                console.log('分享成功');
            },
            (error) => {
                console.error('分享失败:', error);
                // 回退到Web分享API
                shareWithWebAPI(shareText);
            }
        );
    } else {
        // 使用Web分享API
        shareWithWebAPI(shareText);
    }
}

// 使用Web Share API分享
function shareWithWebAPI(text) {
    if (navigator.share) {
        navigator.share({
            title: '医学微量泵计算结果',
            text: text
        })
        .then(() => {
            console.log('分享成功');
        })
        .catch((error) => {
            console.error('分享失败:', error);
            // 回退到复制到剪贴板
            copyToClipboard(text);
        });
    } else {
        // 复制到剪贴板
        copyToClipboard(text);
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    // 选择并复制文本
    textarea.select();
    document.execCommand('copy');
    
    // 移除临时元素
    document.body.removeChild(textarea);
    
    // 显示提示
    showToast('结果已复制到剪贴板');
}

// 切换历史记录模态框
function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.classList.toggle('hidden');
    
    if (!modal.classList.contains('hidden')) {
        // 显示历史记录
        renderHistory();
    }
}

// 渲染历史记录
function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (calculationHistory.length === 0) {
        historyList.innerHTML = '<div class="text-center text-gray-500 py-8">暂无历史记录</div>';
        return;
    }
    
    // 渲染每条历史记录
    calculationHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.addEventListener('click', () => {
            // 点击历史记录，重新显示结果
            currentResult = item;
            displayResult(item);
            toggleHistoryModal(); // 关闭模态框
        });
        
        if (item.type === 'rate') {
            historyItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-blue-700">${item.drug}</h4>
                    <span class="text-xs text-gray-500">${formatDateTime(item.timestamp)}</span>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    <div>体重: ${item.weight} kg | 剂量: ${item.dose} ${item.unit}</div>
                    <div>药物总量: ${item.totalDrug} mg | 稀释液量: ${item.dilution} ml</div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-700">泵入速度</span>
                    <span class="font-bold text-blue-600">${item.rate} ml/h</span>
                </div>
            `;
        } else {
            historyItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-blue-700">${item.drug}</h4>
                    <span class="text-xs text-gray-500">${formatDateTime(item.timestamp)}</span>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    <div>体重: ${item.weight} kg | 泵速: ${item.rate} ml/h</div>
                    <div>药物总量: ${item.totalDrug} mg | 稀释液量: ${item.dilution} ml</div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-700">药物浓度</span>
                    <span class="font-bold text-blue-600">${item.concentration} ${item.unit}</span>
                </div>
            `;
        }
        
        historyList.appendChild(historyItem);
    });
}

// 清空历史记录
function clearHistory() {
    // 确认对话框
    navigator.notification.confirm(
        '确定要清空所有历史记录吗？此操作不可恢复。',
        (buttonIndex) => {
            if (buttonIndex === 1) { // 确定按钮
                // 清空历史记录
                calculationHistory = [];
                
                // 保存到本地存储
                saveHistory();
                
                // 更新UI
                renderHistory();
                
                // 显示提示
                showToast('历史记录已清空');
            }
        },
        '清空历史记录',
        ['确定', '取消']
    );
}

// 切换设置模态框
function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
}

// 切换主题
function changeTheme(theme) {
    settings.theme = theme;
    applyTheme(theme);
    saveSettings();
}

// 应用主题
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-dark').classList.add('bg-gray-800', 'text-white');
        document.getElementById('theme-dark').classList.remove('bg-white', 'text-gray-700');
        document.getElementById('theme-light').classList.add('bg-white', 'text-gray-700');
        document.getElementById('theme-light').classList.remove('bg-gray-800', 'text-white');
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('theme-light').classList.add('bg-gray-800', 'text-white');
        document.getElementById('theme-light').classList.remove('bg-white', 'text-gray-700');
        document.getElementById('theme-dark').classList.add('bg-white', 'text-gray-700');
        document.getElementById('theme-dark').classList.remove('bg-gray-800', 'text-white');
    }
}

// 导出数据
function exportData() {
    // 创建导出数据对象
    const exportData = {
        settings: settings,
        history: calculationHistory,
        favorites: favorites,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
    };
    
    // 转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 检查是否有文件插件
    if (typeof cordova !== 'undefined' && cordova.file) {
        // 使用Cordova文件插件保存文件
        const fileName = `medical-pump-data-${formatDate(new Date())}.json`;
        const filePath = cordova.file.externalDataDirectory + fileName;
        
        window.resolveLocalFileSystemURL(
            cordova.file.externalDataDirectory,
            (dirEntry) => {
                dirEntry.getFile(
                    fileName,
                    { create: true },
                    (fileEntry) => {
                        fileEntry.createWriter(
                            (fileWriter) => {
                                fileWriter.onwriteend = () => {
                                    console.log('文件写入成功');
                                    
                                    // 显示保存成功提示
                                    showToast(`数据已导出到: ${fileName}`);
                                    
                                    // 可以选择使用文件管理器打开
                                    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.fileOpener2) {
                                        cordova.plugins.fileOpener2.open(
                                            filePath,
                                            'application/json',
                                            {
                                                error: (e) => {
                                                    console.error('无法打开文件:', e);
                                                },
                                                success: () => {
                                                    console.log('文件打开成功');
                                                }
                                            }
                                        );
                                    }
                                };
                                
                                fileWriter.onerror = (e) => {
                                    console.error('文件写入失败:', e);
                                    showAlert('导出数据失败');
                                };
                                
                                fileWriter.write(blob);
                            },
                            (error) => {
                                console.error('创建文件写入器失败:', error);
                                showAlert('导出数据失败');
                            }
                        );
                    },
                    (error) => {
                        console.error('获取文件失败:', error);
                        showAlert('导出数据失败');
                    }
                );
            },
            (error) => {
                console.error('获取目录失败:', error);
                showAlert('导出数据失败');
            }
        );
    } else {
        // 回退到Web方法（下载）
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-pump-data-${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('数据已导出');
    }
}

// 导入数据
function importData() {
    // 检查是否有文件选择器插件
    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.fileChooser) {
        // 使用Cordova文件选择器插件
        cordova.plugins.fileChooser.open(
            { mime: 'application/json' },
            (uri) => {
                // 读取选中的文件
                readFile(uri);
            },
            () => {
                console.log('文件选择取消');
            }
        );
    } else {
        // 回退到Web方法（文件输入）
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        processImportedData(data);
                    } catch (error) {
                        console.error('解析JSON失败:', error);
                        showAlert('导入失败：无效的数据格式');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

// 读取文件
function readFile(uri) {
    window.resolveLocalFileSystemURL(
        uri,
        (fileEntry) => {
            fileEntry.file(
                (file) => {
                    const reader = new FileReader();
                    reader.onloadend = (e) => {
                        try {
                            const data = JSON.parse(e.target.result);
                            processImportedData(data);
                        } catch (error) {
                            console.error('解析JSON失败:', error);
                            showAlert('导入失败：无效的数据格式');
                        }
                    };
                    reader.readAsText(file);
                },
                (error) => {
                    console.error('获取文件失败:', error);
                    showAlert('读取文件失败');
                }
            );
        },
        (error) => {
            console.error('解析URI失败:', error);
            showAlert('无法访问文件');
        }
    );
}

// 处理导入的数据
function processImportedData(data) {
    // 验证数据格式
    if (!data.version || !data.exportDate) {
        showAlert('导入失败：无效的数据格式');
        return;
    }
    
    // 确认对话框
    navigator.notification.confirm(
        `确定要导入数据吗？这将覆盖当前的数据。\n\n导入数据包含：\n- 设置\n- ${data.history ? data.history.length : 0} 条历史记录\n- ${data.favorites ? data.favorites.length : 0} 条收藏记录\n\n导出日期：${formatDateTime(data.exportDate)}`,
        (buttonIndex) => {
            if (buttonIndex === 1) { // 确定按钮
                // 导入设置
                if (data.settings) {
                    settings = data.settings;
                    applyTheme(settings.theme);
                }
                
                // 导入历史记录
                if (data.history) {
                    calculationHistory = data.history;
                }
                
                // 导入收藏
                if (data.favorites) {
                    favorites = data.favorites;
                }
                
                // 保存到本地存储
                saveSettings();
                saveHistory();
                saveFavorites();
                
                // 更新UI
                renderHistory();
                renderFavorites();
                
                // 显示提示
                showToast('数据导入成功');
                
                // 关闭设置模态框
                toggleSettingsModal();
            }
        },
        '导入数据',
        ['确定', '取消']
    );
}

// 显示页面
function showPage(page) {
    // 隐藏所有页面
    document.getElementById('app').classList.add('hidden');
    document.getElementById('favorites-page').classList.add('hidden');
    document.getElementById('tools-page').classList.add('hidden');
    document.getElementById('about-page').classList.add('hidden');
    
    // 显示选定页面
    if (page === 'home') {
        document.getElementById('app').classList.remove('hidden');
    } else {
        document.getElementById(`${page}-page`).classList.remove('hidden');
        
        // 如果是收藏页面，渲染收藏
        if (page === 'favorites') {
            renderFavorites();
        }
    }
    
    // 更新当前页面
    currentPage = page;
    
    // 更新底部导航状态
    updateBottomNav(page);
}

// 更新底部导航状态
function updateBottomNav(activePage) {
    const navButtons = ['home', 'favorites', 'tools', 'about'];
    
    navButtons.forEach(page => {
        const button = document.getElementById(`${page}-btn`);
        if (page === activePage) {
            button.classList.add('text-blue-600');
            button.classList.remove('text-gray-500');
        } else {
            button.classList.add('text-gray-500');
            button.classList.remove('text-blue-600');
        }
    });
}

// 渲染收藏页面
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="text-center text-gray-500 py-8">暂无收藏记录</div>';
        return;
    }
    
    // 渲染每条收藏记录
    favorites.forEach((item, index) => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'bg-white rounded-xl shadow-md p-4 mb-4';
        
        if (item.type === 'rate') {
            favoriteItem.innerHTML = `
                <div class="mb-3">
                    <h3 class="text-lg font-bold text-blue-700 mb-1">${item.drug}</h3>
                    <p class="text-gray-600 text-sm">体重: ${item.weight} kg | 剂量: ${item.dose} ${item.unit}</p>
                    <p class="text-gray-600 text-sm">药物总量: ${item.totalDrug} mg | 稀释液量: ${item.dilution} ml</p>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700">泵入速度</span>
                        <span class="text-2xl font-bold text-blue-600">${item.rate}</span>
                    </div>
                    <div class="text-right text-gray-500 mt-1">ml/h</div>
                </div>
                <div class="mt-3 flex justify-between">
                    <span class="text-xs text-gray-500">${formatDateTime(item.timestamp)}</span>
                    <button class="text-red-500" onclick="removeFavorite(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        } else {
            favoriteItem.innerHTML = `
                <div class="mb-3">
                    <h3 class="text-lg font-bold text-blue-700 mb-1">${item.drug}</h3>
                    <p class="text-gray-600 text-sm">体重: ${item.weight} kg | 泵速: ${item.rate} ml/h</p>
                    <p class="text-gray-600 text-sm">药物总量: ${item.totalDrug} mg | 稀释液量: ${item.dilution} ml</p>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700">药物浓度</span>
                        <span class="text-2xl font-bold text-blue-600">${item.concentration}</span>
                    </div>
                    <div class="text-right text-gray-500 mt-1">${item.unit}</div>
                </div>
                <div class="mt-3 flex justify-between">
                    <span class="text-xs text-gray-500">${formatDateTime(item.timestamp)}</span>
                    <button class="text-red-500" onclick="removeFavorite(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }
        
        favoritesList.appendChild(favoriteItem);
    });
}

// 移除收藏
function removeFavorite(index) {
    // 确认对话框
    navigator.notification.confirm(
        '确定要移除这条收藏记录吗？',
        (buttonIndex) => {
            if (buttonIndex === 1) { // 确定按钮
                // 从收藏中移除
                favorites.splice(index, 1);
                
                // 保存到本地存储
                saveFavorites();
                
                // 更新UI
                renderFavorites();
                
                // 显示提示
                showToast('已移除收藏');
            }
        },
        '移除收藏',
        ['确定', '取消']
    );
}

// 加载历史记录
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('medicalPumpHistory');
        if (savedHistory) {
            calculationHistory = JSON.parse(savedHistory);
        }
    } catch (error) {
        console.error('加载历史记录失败:', error);
        calculationHistory = [];
    }
}

// 保存历史记录
function saveHistory() {
    try {
        localStorage.setItem('medicalPumpHistory', JSON.stringify(calculationHistory));
    } catch (error) {
        console.error('保存历史记录失败:', error);
    }
}

// 加载收藏
function loadFavorites() {
    try {
        const savedFavorites = localStorage.getItem('medicalPumpFavorites');
        if (savedFavorites) {
            favorites = JSON.parse(savedFavorites);
        }
    } catch (error) {
        console.error('加载收藏失败:', error);
        favorites = [];
    }
}

// 保存收藏
function saveFavorites() {
    try {
        localStorage.setItem('medicalPumpFavorites', JSON.stringify(favorites));
    } catch (error) {
        console.error('保存收藏失败:', error);
    }
}

// 加载设置
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('medicalPumpSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('加载设置失败:', error);
        settings = {
            theme: 'light',
            defaultWeight: '',
            defaultDilution: '50'
        };
    }
}

// 保存设置
function saveSettings() {
    try {
        localStorage.setItem('medicalPumpSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 显示提示
function showToast(message, duration = 2000) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in';
    toast.textContent = message;
    
    // 添加到文档
    document.body.appendChild(toast);
    
    // 设置定时器移除
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// 显示警告框
function showAlert(message) {
    if (typeof navigator !== 'undefined' && navigator.notification) {
        // 使用Cordova对话框
        navigator.notification.alert(
            message,
            () => {},
            '医学微量泵计算工具',
            '确定'
        );
    } else {
        // 使用浏览器对话框
        alert(message);
    }
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return `${formatDate(date)} ${formatTime(date)}`;
}

// 格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化时间
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}