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

// カレンダー予定削除用関数の追加
function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}

// チェックリストの完了トグル関数の追加
function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefresh();
}

// チェックリスト表示
// 現在選択されているタブを管理する変数（デフォルトは1週間分 'week'）
let currentTab = 'week';

// チェックリスト表示（タブ切り替え対応版）
function renderCheckList() {
    todoList.innerHTML = '';
    
    // 今日の日付の基準を作成（時間・分・秒を0にして日付だけで比較できるようにする）
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);
    oneWeekLater.setHours(23, 59, 59, 999); 

    const allItems = [
        ...SCHOOL_EVENTS.map(e => ({ ...e, completed: false, isSchool: true })),
        ...schedules
    ];

    // 選択されているタブに応じてフィルター条件を切り替える
    const filteredSchedules = allItems.filter(item => {
        const itemStart = new Date(item.start);
        itemStart.setHours(0, 0, 0, 0); // 比較のために時間を合わせる

        let itemEnd = item.end ? new Date(item.end) : new Date(item.start);
        if (item.end) {
            itemEnd = new Date(item.end);
            itemEnd.setDate(itemEnd.getDate() - 1); 
        }
        itemEnd.setHours(23, 59, 59, 999);

        if (currentTab === 'today') {
            // 【今日だけ】予定の開始日から終了日の間に「今日」が含まれているか
            return itemStart <= today && itemEnd >= today;
        } else {
            // 【直近1週間】以前と同様の条件
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

// 👇 ここからタブのクリックイベント処理を追加
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
// 🔗 【完全版】通信エラーなし！超圧縮・URL埋め込み型QR共有システム
// =======================================================

exportBtn.addEventListener('click', () => {
    if (schedules.length === 0) {
        alert('共有する予定がありません。新しく予定を追加してから押してください。');
        return;
    }

    try {
        const jsonString = JSON.stringify(schedules);
        const byteArray = new TextEncoder().encode(jsonString);
        const compressed = pako.deflate(byteArray);
        
        const base64Str = btoa(String.fromCharCode(...compressed))
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
        alert('QRコードの作成に失敗しました。予定の文字数を少し減らしてみてください。');
        console.error(e);
    }
});

closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
});

function checkIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedBase64 = urlParams.get('q');

    if (!compressedBase64) return;

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
        const jsonString = new TextDecoder().decode(decompressed);
        const importedSchedules = JSON.parse(jsonString);

        if (!Array.isArray(importedSchedules)) {
            throw new Error('データ形式が正しくありません。');
        }

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


// =======================================================
// 🎒 独立した持ち物・メモ帳システム
// =======================================================

const memoInput = document.getElementById('memo-input');
const memoAddBtn = document.getElementById('memo-add-btn');
const memoListEl = document.getElementById('memo-list');

let memoList = JSON.parse(localStorage.getItem('proCalendarMemos')) || [];

// 初期表示とイベントの紐付け
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

// 最初の起動時用ロード
renderCheckList();