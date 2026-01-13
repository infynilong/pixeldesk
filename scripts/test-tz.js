const now = new Date();
const utcDate = now.toISOString().split('T')[0];
const shDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).format(now).replace(/\//g, '-');

console.log('Current UTC Date:', utcDate);
console.log('Current Shanghai Date:', shDate);
console.log('Current Time (Local):', now.toString());
