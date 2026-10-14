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

// ⚠️ ご自身のGitHub PagesのURL（末尾に / ）を記述してください
const MY_SITE_URL = "https://kkrntt.github.io/Schedule-Calendar/"; 

// ユーザー独自のデータの読み込み
let schedules = JSON.parse(localStorage.getItem('proCalendarSchedules')) || [];
let memoList = JSON.parse(localStorage.getItem('proCalendarMemos')) || [];

// 学校の固定行事データ（IDの重複を修正）
const SCHOOL_EVENTS = [
    { id: 'school-1', title: '📝 記述模試', start: '2026-08-20', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-2', title: '🎪 記念祭', start: '2026-08-29', end: '2026-09-01', color: '#e67e22', allDay: true, isFixed: true }, 
    { id: 'school-3', title: '📝 学力テスト', start: '2026-09-03', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-4', title: '✍️ 2学期中間試験', start: '2026-09-29', end: '2026-10-03', color: '#c0392b', allDay: true, isFixed: true },
    { id: 'school-5', title: '✈ アメリカ海外研修', start: '2026-10-04', end: '2026-10-12', color: '#1B3B6F', allDay: true, isFixed: true },
    { id: 'school-6', title: '🏠️ 代休', start: '2026-10-13', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-7', title: '📝 進研模試', start: '2026-10-24', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-8', title: '🧑‍🤝‍🧑 授業公開', start: '2026-10-31', color: '#e67e22', allDay: true, isFixed: true },
    { id: 'school-8', title: '🏠️ 創立記念日', start: '2026-10-15', color: '#2c3e50', allDay: true, isFixed: true }
]; 


// 日付フォーマット関数 (YYYY-MM-DD)
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 初期値設定
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


// =======================================================
// 🔄 データ処理 & 予定の追加・削除機能
// =======================================================
function getFormattedEvents() {
    const userEvents = schedules.map(item => ({
        id: item.id,
        title: item.completed ? `✅ ${item.title}` : item.title,
        start: item.start,
        color: item.color,
        allDay: item.allDay,
        opacity: item.completed ? 0.5 : 1.0
    }));
    return [...SCHOOL_EVENTS, ...userEvents];
}

addBtn.addEventListener('click', () => {
    const baseDateStr = dateInput.value;
    const title = titleInput.value.trim();
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
            schedules.push({
                id: String(Date.now() + i + Math.random()), 
                title: title,
                start: dateString,
                color: color, 
                allDay: true,
                completed: false 
            });
            currentDate.setDate(currentDate.getDate() + 7);
        }
    } else {
        schedules.push({
            id: String(Date.now() + Math.random()),
            title: title,
            start: baseDateStr,
            color: color, 
            allDay: true,
            completed: false
        });
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

function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}

function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) item.completed = !item.completed;
        return item;
    });
    saveAndRefresh();
}


// =======================================================
// 📋 やること・チェックリスト表示
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
// 🔗 【同期機能】予定＆メモの複合QRコード共有システム
// =======================================================

// QRコード作成（予定＋メモ）
exportBtn.addEventListener('click', () => {
    const todayStr = formatDate(new Date());

    // 今日以降の予定を抽出
    const futureSchedules = schedules.filter(item => item.start >= todayStr);

    if (futureSchedules.length === 0 && memoList.length === 0) {
        alert('共有対象（今日以降の予定またはメモ）がありません。');
        return;
    }

    try {
        // 予定データとメモデータをひとつの構造体に統合
        const exportData = {
            s: futureSchedules.map(e => ({ i: e.id, t: e.title, d: e.start, c: e.color })), // 容量節約のためキー名を短縮
            m: memoList.map(m => ({ i: m.id, t: m.text, c: m.completed ? 1 : 0 }))
        };

        const jsonString = JSON.stringify(exportData);
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(jsonString);
        const compressed = pako.deflate(byteArray);
        
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
        alert('QRコードの作成に失敗しました。データ量が多すぎる可能性があります。');
        console.error(e);
    }
});

closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
});

// 受信処理 (URLパラメータからの展開)
function checkIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedBase64 = urlParams.get('q');

    if (!compressedBase64) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (!confirm('📥 共有データ（予定・メモ）が届きました！\nあなたのカレンダーとメモ帳に同期しますか？')) {
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
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(decompressed);
        
        const importedData = JSON.parse(jsonString);

        // 互換性チェック: 新データ構造(s, m) または 旧データ構造(配列)
        let importedSchedules = [];
        let importedMemos = [];

        if (Array.isArray(importedData)) {
            importedSchedules = importedData;
        } else if (typeof importedData === 'object' && importedData !== null) {
            if (importedData.s) {
                importedSchedules = importedData.s.map(e => ({
                    id: e.i || String(Date.now() + Math.random()),
                    title: e.t,
                    start: e.d,
                    color: e.c || '#3498db',
                    allDay: true,
                    completed: false
                }));
            }
            if (importedData.m) {
                importedMemos = importedData.m.map(m => ({
                    id: m.i || 'memo-' + Date.now() + Math.random(),
                    text: m.t,
                    completed: Boolean(m.c)
                }));
            }
        }

        // 予定の追加（重複防止）
        importedSchedules.forEach(newIn => {
            if (newIn && newIn.id) {
                const isExist = schedules.some(oldIn => oldIn.id === newIn.id);
                if (!isExist) schedules.push(newIn);
            }
        });

        // メモの追加（重複防止）
        importedMemos.forEach(newMemo => {
            if (newMemo && newMemo.id) {
                const isExist = memoList.some(oldMemo => oldMemo.id === newMemo.id);
                if (!isExist) memoList.push(newMemo);
            }
        });

        saveAndRefresh();
        saveAndRefreshMemos();
        alert('🎉 予定とメモの同期に成功しました！');

    } catch (e) {
        alert('データの読み込みに失敗しました。URLまたはQRコードが破損しています。');
        console.error(e);
    }
}


// =======================================================
// 🎒 持ち物・メモ帳システム
// =======================================================
const memoInput = document.getElementById('memo-input');
const memoAddBtn = document.getElementById('memo-add-btn');
const memoListEl = document.getElementById('memo-list');

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
        if (item.id === id) item.completed = !item.completed;
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

// 初期実行
renderCheckList();
renderMemoList();
checkIncomingShare();