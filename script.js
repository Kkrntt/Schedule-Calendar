const dateInput = document.getElementById('todo-date');
const titleInput = document.getElementById('todo-title');
const colorInput = document.getElementById('todo-color');
const isWeeklyCheck = document.getElementById('is-weekly');
const addBtn = document.getElementById('add-btn');
const calendarEl = document.getElementById('calendar');
const todoList = document.getElementById('todo-list');

const exportBtn = document.getElementById('export-btn');
const qrModal = document.getElementById('qr-modal');
const qrcodeEl = document.getElementById('qrcode');
const closeQrBtn = document.getElementById('close-qr-btn');

// ⚠️【最重要】ここにあなたのGitHub PagesのURL（末尾に / をつける）を貼り付けてください！
// 例: "https://yourname.github.io/schedule-app/"
const MY_SITE_URL = "https://kkrntt.github.io/Schedule-Calendar/"; 

// ユーザー独自のデータの読み込み
let schedules = JSON.parse(localStorage.getItem('proCalendarSchedules')) || [];

// 学校の固定行事データ
const SCHOOL_EVENTS = [
    { id: 'school-1', title: '📝 記述模試', start: '2026-08-20', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-2', title: '🎪 記念祭', start: '2026-08-29', end: '2026-09-01', color: '#e67e22', allDay: true, isFixed: true }, 
    { id: 'school-3', title: '📝 学力テスト', start: '2026-09-03', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-4', title: '✍️ 2学期中間試験', start: '2026-09-29', end: '2026-10-03', color: '#c0392b', allDay: true, isFixed: true } 
];

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

dateInput.value = formatDate(new Date());

// カレンダーの初期化
const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    events: getFormattedEvents(), 
    eventClick: function(info) {
        const isFixedEvent = SCHOOL_EVENTS.some(item => item.id === info.event.id);
        if (isFixedEvent) {
            alert(`「${info.event.title}」は学校の公式行事のため、変更・削除はできません。`);
            return;
        }
        const targetEvent = schedules.find(item => item.id === info.event.id);
        if (!targetEvent) return;

        if (confirm(`「${targetEvent.title}」をカレンダーから完全に削除しますか？`)) {
            deleteFromList(info.event.id);
        }
    }
});
calendar.render();

// 【新機能】ページが開かれたとき、URLに共有データが含まれているかチェックする（受信処理）
checkIncomingShare();

// カレンダー表示用にデータを加工
function getFormattedEvents() {
    const userEvents = schedules.map(item => {
        return {
            id: item.id,
            title: item.completed ? `✅ ${item.title}` : item.title,
            start: item.start,
            color: item.color,
            allDay: item.allDay,
            opacity: item.completed ? 0.5 : 1.0
        };
    });
    return [...SCHOOL_EVENTS, ...userEvents];
}

// 予定追加
addBtn.addEventListener('click', () => {
    const baseDateStr = dateInput.value;
    const title = titleInput.value;
    const color = colorInput.value;
    const isWeekly = isWeeklyCheck.checked;

    if (!baseDateStr || !title) {
        alert('日付と予定を入力してください！');
        return;
    }

    if (isWeekly) {
        let currentDate = new Date(baseDateStr);
        for (let i = 0; i < 12; i++) {
            const dateString = formatDate(currentDate);
            const newSchedule = {
                id: String(Date.now() + i + Math.random()), 
                title: title,
                start: dateString,
                color: color, 
                allDay: true,
                completed: false 
            };
            schedules.push(newSchedule);
            currentDate.setDate(currentDate.getDate() + 7);
        }
    } else {
        const newSchedule = {
            id: String(Date.now()),
            title: title,
            start: baseDateStr,
            color: color, 
            allDay: true,
            completed: false
        };
        schedules.push(newSchedule);
    }

    saveAndRefresh();
    titleInput.value = '';
    isWeeklyCheck.checked = false;
});

function saveAndRefresh() {
    localStorage.setItem('proCalendarSchedules', JSON.stringify(schedules));
    calendar.removeAllEvents();
    calendar.addEventSource(getFormattedEvents()); 
    renderCheckList();
}

// チェックリスト表示
function renderCheckList() {
    todoList.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);
    oneWeekLater.setHours(23, 59, 59, 999); 

    const allItems = [
        ...SCHOOL_EVENTS.map(e => ({ ...e, completed: false, isSchool: true })),
        ...schedules
    ];

    const filteredSchedules = allItems.filter(item => {
        const itemStart = new Date(item.start);
        let itemEnd = item.end ? new Date(item.end) : new Date(item.start);
        if (item.end) itemEnd.setDate(itemEnd.getDate() - 1); 
        itemEnd.setHours(23, 59, 59, 999);
        return itemStart <= oneWeekLater && itemEnd >= today;
    });

    const sortedSchedules = filteredSchedules.sort((a, b) => new Date(a.start) - new Date(b.start));

    if (sortedSchedules.length === 0) {
        todoList.innerHTML = '<li class="todo-item" style="color: #aaa; justify-content: center;">直近1週間の予定はありません</li>';
        return;
    }

    window.toggleComplete = toggleComplete;

    sortedSchedules.forEach(item => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        const isChecked = item.completed ? 'checked' : '';
        const textClass = item.completed ? 'completed' : '';
        const weekStr = new Date(item.start).toLocaleDateString('ja-JP', { weekday: 'short' });

        if (item.isSchool) {
            li.innerHTML = `
                <div class="todo-left">
                    <input type="checkbox" disabled>
                    <span class="task-date" style="background: #2c3e50; color: #fff;">学校行事</span>
                    <span style="border-left: 4px solid ${item.color}; padding-left: 6px; font-weight: bold;">${item.title}</span>
                </div>
                <span style="font-size: 12px; color: #7f8c8d; padding-right: 5px;">固定</span>
            `;
        } else {
            li.innerHTML = `
                <div class="todo-left">
                    <input type="checkbox" ${isChecked} onchange="toggleComplete('${item.id}')">
                    <span class="task-date">${item.start}(${weekStr})</span>
                    <span class="${textClass}" style="border-left: 4px solid ${item.color}; padding-left: 6px;">${item.title}</span>
                </div>
            `;
        }
        todoList.appendChild(li);
    });
}

function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefresh();
}

function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}


// =======================================================
// 🔗 【完全版】通信エラーなし！超圧縮・URL埋め込み型QR共有システム
// =======================================================

// 1. 予定データを極限まで圧縮して、URLにしてQRコードを表示する
exportBtn.addEventListener('click', () => {
    if (schedules.length === 0) {
        alert('共有する予定がありません。新しく予定を追加してから押してください。');
        return;
    }

    try {
        const jsonString = JSON.stringify(schedules);
        
        // 【超圧縮処理】日本語のデータをZIP形式のようにギューッと小さくします
        const byteArray = new TextEncoder().encode(jsonString);
        const compressed = pako.deflate(byteArray);
        
        // 圧縮したデータをURLに載せられる文字に変換（Base64URL）
        const base64Str = btoa(String.fromCharCode(...compressed))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 友達が読み取る用のURLを作成（自分のサイトURL + ?q=圧縮データ）
        const shareUrl = `${MY_SITE_URL}?q=${base64Str}`;

        // QRコード表示領域をクリアして再生成
        qrcodeEl.innerHTML = '';
        new QRCode(qrcodeEl, {
            text: shareUrl, // 外部サーバーを一切使わず、このURLを開くだけで同期できます！
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L // 圧縮しているのでドットも細かくなりすぎません
        });

        qrModal.style.display = 'flex';

    } catch (e) {
        alert('QRコードの作成に失敗しました。予定の文字数を少し減らしてみてください。');
        console.error(e);
    }
});

closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
});

// 2. アクセスされたURLに「?q=XXX」がついているかチェックして解凍する（受信処理）
function checkIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedBase64 = urlParams.get('q');

    if (!compressedBase64) return; // 共有データがなければ通常の起動

    // URLの見た目を綺麗に戻す（?q=... を消す）
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!confirm('📥 新しい予定データが届きました！\nあなたのカレンダーに合流（同期）させますか？')) {
        return;
    }

    try {
        // Base64URL形式を元に戻す
        let base64 = compressedBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) { base64 += '='; }
        
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 【解凍処理】圧縮されたデータを元の文字に戻す
        const decompressed = pako.inflate(bytes);
        const jsonString = new TextDecoder().decode(decompressed);
        const importedSchedules = JSON.parse(jsonString);

        if (!Array.isArray(importedSchedules)) {
            throw new Error('データ形式が正しくありません。');
        }

        // 重複を除外してマージ
        importedSchedules.forEach(newIn => {
            const isExist = schedules.some(oldIn => oldIn.id === newIn.id);
            if (!isExist) {
                schedules.push(newIn);
            }
        });

        saveAndRefresh();
        alert('🎉 予定の同期に成功しました！');

    } catch (e) {
        alert('予定の読み込みに失敗しました。QRコードが途中で切れている可能性があります。');
        console.error(e);
    }
}