const dateInput = document.getElementById('todo-date');
const titleInput = document.getElementById('todo-title');
const colorInput = document.getElementById('todo-color');
const isWeeklyCheck = document.getElementById('is-weekly');
const addBtn = document.getElementById('add-btn');
const calendarEl = document.getElementById('calendar');
const todoList = document.getElementById('todo-list');

// ユーザー独自のデータの読み込み（LocalStorage）
let schedules = JSON.parse(localStorage.getItem('proCalendarSchedules')) || [];

// 学校の固定行事データ
const SCHOOL_EVENTS = [
    { id: 'school-1', title: '📝 記述模試', start: '2026-08-20', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-2', title: '🎪 記念祭', start: '2026-08-29', end: '2026-09-01', color: '#e67e22', allDay: true, isFixed: true }, 
    { id: 'school-3', title: '📝 学力テスト', start: '2026-09-03', color: '#2c3e50', allDay: true, isFixed: true },
    { id: 'school-4', title: '✍️ 2学期中間試験', start: '2026-09-29', end: '2026-10-03', color: '#c0392b', allDay: true, isFixed: true } 
];

// 日付オブジェクトを YYYY-MM-DD の文字列に安全に変換する関数
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 初期表示の際、日付入力欄に今日の日付を自動セット
dateInput.value = formatDate(new Date());

// カレンダーの初期化
const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    events: getFormattedEvents(), 
    eventClick: function(info) {
        // クリックされた予定が学校の固定行事かどうかを判定
        const isFixedEvent = SCHOOL_EVENTS.some(item => item.id === info.event.id);
        
        if (isFixedEvent) {
            alert(`「${info.event.title}」は学校の公式行事のため、変更・削除はできません。`);
            return;
        }

        // 【改良ポイント】クリックしたら、確認なしで即座に完了/未完了を切り替える
        toggleComplete(info.event.id);
    }
});
calendar.render();

// 初期表示のタスクリスト（チェックリスト）描画
renderCheckList();

// カレンダー表示用にデータを加工・合流する関数
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

// 予定追加ボタンのクリックイベント
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

// データの保存と画面の再描画
function saveAndRefresh() {
    localStorage.setItem('proCalendarSchedules', JSON.stringify(schedules));
    
    // カレンダーの表示イベントをリフレッシュ
    calendar.removeAllEvents();
    calendar.addEventSource(getFormattedEvents()); 
    
    // チェックリストの表示をリフレッシュ
    renderCheckList();
}

// チェックリスト（TODOリスト）を表示する関数
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
    window.deleteFromList = deleteFromList;

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
                <button class="del-task-btn" onclick="deleteFromList('${item.id}')">削除</button>
            `;
        }
        todoList.appendChild(li);
    });
}

// チェックボックスまたはカレンダーが押されたときに完了/未完了の状態を切り替える関数
function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefresh();
}

// リストからユーザーの予定を削除する関数
function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}