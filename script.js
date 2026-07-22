// =======================================================
// 📌 要素の取得と初期設定
// =======================================================
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

// ⚠️【最重要】ご自身のGitHub PagesのURL（末尾に / ）を記述してください
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

// 日付フォーマット関数 (YYYY-MM-DD)
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 日付入力欄の初期値を「今日」に設定
dateInput.value = formatDate(new Date());


// =======================================================
// 🗓️ FullCalendar の初期化と描画
// =======================================================
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

// ページ読み込み時にURL共有パラメータ（?q=...）をチェック
checkIncomingShare();


// =======================================================
// 🔄 データ処理 & 予定の追加・削除機能
// =======================================================

// カレンダー表示用データの整形
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

// ローカルストレージ保存 & カレンダー再描画
function saveAndRefresh() {
    localStorage.setItem('proCalendarSchedules', JSON.stringify(schedules));
    calendar.removeAllEvents();
    calendar.addEventSource(getFormattedEvents()); 
    renderCheckList();
}

// 予定削除
function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}

// チェックリスト完了切り替え
function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefresh();
}


// =======================================================
// 📋 やること・チェックリスト表示 (タブ切り替え対応)
// =======================================================
let currentTab = 'week';

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
        itemStart.setHours(0, 0, 0, 0);

        let itemEnd = item.end ? new Date(item.end) : new Date(item.start);
        if (item.end) {
            itemEnd = new Date(item.end);
            itemEnd.setDate(itemEnd.getDate() - 1); 
        }
        itemEnd.setHours(23, 59, 59, 999);

        if (currentTab === 'today') {
            return itemStart <= today && itemEnd >= today;
        } else {
            return itemStart <= oneWeekLater && itemEnd >= today;
        }
    });

    const sortedSchedules = filteredSchedules.sort((a, b) => new Date(a.start) - new Date(b.start));

    if (sortedSchedules.length === 0) {
        const noTaskMsg = currentTab === 'today' ? '今日の予定はありません' : '直近1週間の予定はありません';
        todoList.innerHTML = `<li class="todo-item" style="color: #aaa; justify-content: center;">${noTaskMsg}</li>`;
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

// タブのクリックイベント設定
const tabWeekBtn = document.getElementById('tab-week');
const tabTodayBtn = document.getElementById('tab-today');

if (tabWeekBtn && tabTodayBtn) {
    tabWeekBtn.addEventListener('click', () => {
        currentTab = 'week';
        tabWeekBtn.classList.add('active');
        tabTodayBtn.classList.remove('active');
        renderCheckList();
    });

    tabTodayBtn.addEventListener('click', () => {
        currentTab = 'today';
        tabTodayBtn.classList.add('active');
        tabWeekBtn.classList.remove('active');
        renderCheckList();
    });
}


// =======================================================
// 🔗 【完全・安定版】超圧縮・URL埋め込み型QR共有システム
// =======================================================

// 送信機能 (QRコード生成)
exportBtn.addEventListener('click', () => {
    // 日本時間での「今日」の年月日文字列（YYYY-MM-DD）を取得
    const todayStr = formatDate(new Date());

    // 文字列比較で「今日以降」の予定だけを抽出（タイムゾーンバグ防止）
    const futureSchedules = schedules.filter(item => item.start >= todayStr);

    if (futureSchedules.length === 0) {
        alert('今日以降の予定がありません。未来の予定を追加してからQRコードを作成してください。');
        return;
    }

    try {
        const jsonString = JSON.stringify(futureSchedules);
        
        // UTF-8エンコーダーを使用して絵文字や特殊文字を安全にバイト化
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(jsonString);
        const compressed = pako.deflate(byteArray);
        
        // Uint8Array から Binary String への安全な変換
        let binary = '';
        const len = compressed.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(compressed[i]);
        }
        
        const base64Str = btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const shareUrl = `${MY_SITE_URL}?q=${base64Str}`;

        qrcodeEl.innerHTML = '';
        new QRCode(qrcodeEl, {
            text: shareUrl,
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L
        });

        qrModal.style.display = 'flex';

    } catch (e) {
        alert('QRコードの作成に失敗しました。');
        console.error(e);
    }
});

closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
});

// 受信機能 (URLからのデータ復元 & 同期)
function checkIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedBase64 = urlParams.get('q');

    if (!compressedBase64) return;

    // URLのパラメータをきれいに削除（再読み込み時の重複処理防止）
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!confirm('📥 新しい予定データが届きました！\nあなたのカレンダーに合流（同期）させますか？')) {
        return;
    }

    try {
        let base64 = compressedBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) { base64 += '='; }
        
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const decompressed = pako.inflate(bytes);
        
        // UTF-8デコーダーを使用して日本語・絵文字テキストへ復元
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(decompressed);
        
        // JSONデータをパース（解析）
        const importedSchedules = JSON.parse(jsonString);

        // 💡 修正ポイント: データの存在チェックをより安全に実施
        if (importedSchedules && typeof importedSchedules === 'object') {
            // 配列形式に整えてループ処理
            const scheduleList = Array.isArray(importedSchedules) ? importedSchedules : Object.values(importedSchedules);

            scheduleList.forEach(newIn => {
                if (newIn && newIn.id) {
                    const isExist = schedules.some(oldIn => oldIn.id === newIn.id);
                    if (!isExist) {
                        schedules.push(newIn);
                    }
                }
            });

            saveAndRefresh();
            alert('🎉 予定の同期に成功しました！');
        } else {
            throw new Error('データが空または無効です。');
        }

    } catch (e) {
        alert('予定の読み込みに失敗しました。QRコードデータが壊れている可能性があります。');
        console.error(e);
    }
}


// =======================================================
// 🎒 独立した持ち物・メモ帳システム
// =======================================================
const memoInput = document.getElementById('memo-input');
const memoAddBtn = document.getElementById('memo-add-btn');
const memoListEl = document.getElementById('memo-list');

let memoList = JSON.parse(localStorage.getItem('proCalendarMemos')) || [];

renderMemoList();

memoAddBtn.addEventListener('click', addMemoItem);
memoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addMemoItem();
});

function addMemoItem() {
    const text = memoInput.value.trim();
    if (!text) return;

    const newMemo = {
        id: 'memo-' + Date.now(),
        text: text,
        completed: false
    };

    memoList.push(newMemo);
    saveAndRefreshMemos();
    memoInput.value = '';
}

function renderMemoList() {
    memoListEl.innerHTML = '';

    if (memoList.length === 0) {
        memoListEl.innerHTML = '<li class="todo-item" style="color: #aaa; justify-content: center;">メモはありません</li>';
        return;
    }

    window.toggleMemoComplete = toggleMemoComplete;
    window.deleteMemo = deleteMemo;

    memoList.forEach(item => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        
        const isChecked = item.completed ? 'checked' : '';
        const textClass = item.completed ? 'completed' : '';

        li.innerHTML = `
            <div class="todo-left">
                <input type="checkbox" ${isChecked} onchange="toggleMemoComplete('${item.id}')">
                <span class="${textClass}">${item.text}</span>
            </div>
            <button class="del-task-btn" onclick="deleteMemo('${item.id}')">削除</button>
        `;
        memoListEl.appendChild(li);
    });
}

function toggleMemoComplete(id) {
    memoList = memoList.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefreshMemos();
}

function deleteMemo(id) {
    memoList = memoList.filter(item => item.id !== id);
    saveAndRefreshMemos();
}

function saveAndRefreshMemos() {
    localStorage.setItem('proCalendarMemos', JSON.stringify(memoList));
    renderMemoList();
}

// 最初の起動時用チェックリスト描画
renderCheckList();