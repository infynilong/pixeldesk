// 工位相关的多语言文本
export const workstationI18n = {
    'zh-CN': {
        bindingTitle: '工位绑定',
        workstationId: '工位ID',
        position: '位置',
        type: '类型',
        bindingFee: '绑定费用',
        duration: '30天',
        points: '象素币',
        yourPoints: '您的象素币',
        confirm: '确认绑定',
        cancel: '取消',
        success: '绑定成功！',
        failed: '绑定失败，请重试',
        insufficientPoints: '象素币不足',

        // 状态更新
        updateStatus: '更新状态',
        currentStatus: '当前状态',
        working: '工作中',
        break: '休息中',
        meeting: '会议中',
        lunch: '午餐时间',
        update: '更新',
        statusUpdated: '状态已更新'
    },
    'en': {
        bindingTitle: 'Workstation Binding',
        workstationId: 'Station ID',
        position: 'Position',
        type: 'Type',
        bindingFee: 'Binding Fee',
        duration: '30 Days',
        points: 'PixelCoins',
        yourPoints: 'Your PixelCoins',
        confirm: 'Confirm Binding',
        cancel: 'Cancel',
        success: 'Binding Successful!',
        failed: 'Binding failed, please retry',
        insufficientPoints: 'Insufficient PixelCoins',

        // 状态更新
        updateStatus: 'Update Status',
        currentStatus: 'Current Status',
        working: 'Working',
        break: 'Taking a Break',
        meeting: 'In Meeting',
        lunch: 'Lunch Time',
        update: 'Update',
        statusUpdated: 'Status Updated'
    }
};

// 获取当前语言，默认中文
export function getCurrentLanguage() {
    return localStorage.getItem('pixeldesk-language') || 'zh-CN';
}

// 获取翻译文本
export function t(key) {
    const lang = getCurrentLanguage();
    return workstationI18n[lang]?.[key] || workstationI18n['zh-CN'][key] || key;
}

// 设置语言
export function setLanguage(lang) {
    localStorage.setItem('pixeldesk-language', lang);
}
