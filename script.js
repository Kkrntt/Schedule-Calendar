const dateInput = document.getElementById('todo-date');
const titleInput = document.getElementById('todo-title');
const colorInput = document.getElementById('todo-color');
const isWeeklyCheck = document.getElementById('is-weekly');
const addBtn = document.getElementById('add-btn');
const calendarEl = document.getElementById('calendar');
const todoList = document.getElementById('todo-list');

// データの読み込み
let schedules = JSON.parse(localStorage.getItem('proCalendarSchedules')) || [];

// カレンダー初期化
const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    events: schedules,
    eventClick: function(info) {
        if (confirm(`「${info.event.title}」を削除しますか？`)) {
            schedules = schedules.filter(item => item.id !== info.event.id);
            saveAndRefresh();
        }
    }
});
calendar.render();

// 初期表示でチェックリストを描画
renderCheckList();

// 追加ボタンクリック
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
        // 【毎週繰り返す場合】3ヶ月間（12週間分）ループして登録
        let currentDate = new Date(baseDateStr);
        
        for (let i = 0; i < 12; i++) {
            // YYYY-MM-DD 形式の文字列を作る
            const dateString = currentDate.toISOString().split('T')[0];
            
            const newSchedule = {
                id: String(Date.now() + i), // 被らないID
                title: title,
                start: dateString,
                color: color, 
                allDay: true,
                completed: false 
            };
            schedules.push(newSchedule);

            // 日付を7日進める
            currentDate.setDate(currentDate.getDate() + 7);
        }
    } else {
        // 【単発の予定の場合】
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

// 保存と画面更新
function saveAndRefresh() {
    localStorage.setItem('proCalendarSchedules', JSON.stringify(schedules));
    
    // カレンダー更新
    calendar.removeAllEvents();
    calendar.addEventSource(schedules);
    
    // チェックリスト更新
    renderCheckList();
}

// チェックリスト（TODOリスト）を表示する関数
function renderCheckList() {
    todoList.innerHTML = '';

    // 【修正ポイント】今日から1週間後（7日後）までの日付を計算
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間を00:00:00にする（日付の比較のため）

    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);
    oneWeekLater.setHours(23, 59, 59, 999); // 7日後の23:59:59までを含める

    // 1週間以内のタスクだけを絞り込む（フィルター）
    const filteredSchedules = schedules.filter(item => {
        const itemDate = new Date(item.start);
        return itemDate >= today && itemDate <= oneWeekLater;
    });

    // 日付順に並び替え
    const sortedSchedules = filteredSchedules.sort((a, b) => new Date(a.start) - new Date(b.start));

    // リストが空っぽだった場合のメッセージ
    if (sortedSchedules.length === 0) {
        todoList.innerHTML = '<li class="todo-item" style="color: #aaa; justify-content: center;">直近1週間の予定はありません</li>';
        return;
    }

    sortedSchedules.forEach(item => {
        const li = document.createElement('li');
        li.className = 'todo-item';

        const isChecked = item.completed ? 'checked' : '';
        const textClass = item.completed ? 'completed' : '';

        li.innerHTML = `
            <div class="todo-left">
                <input type="checkbox" ${isChecked} onchange="toggleComplete('${item.id}')">
                <span class="task-date">${item.start}</span>
                <span class="${textClass}" style="border-left: 4px solid ${item.color}; padding-left: 6px;">${item.title}</span>
            </div>
            <button class="del-task-btn" onclick="deleteFromList('${item.id}')">削除</button>
        `;
        todoList.appendChild(li);
    });
}

// チェックボックスが押されたときに完了状態を切り替える
function toggleComplete(id) {
    schedules = schedules.map(item => {
        if (item.id === id) {
            item.completed = !item.completed;
        }
        return item;
    });
    saveAndRefresh();
}

// リスト側からの削除用
function deleteFromList(id) {
    schedules = schedules.filter(item => item.id !== id);
    saveAndRefresh();
}