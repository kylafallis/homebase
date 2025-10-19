// --- CONSTANTS AND INITIALIZATION ---
// Using DEMO_KEY for Canvas environment. Get your own key from NASA for real use.
const NASA_API_URL = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY";
const LOCAL_STORAGE_KEYS = {
    TASKS: 'girlypopTasks',
    NOTES: 'girlypopNotes',
    HABITS: 'girlypopHabits',
    LAST_RESET: 'girlypopHabitResetDate',
    SCHEDULE: 'girlypopSchedule'
};

const HABITS_CONFIG = [
    { id: 'water', name: 'Hydrate (Fuel Check)', done: false },
    { id: 'study', name: 'Launch Study Module', done: false },
    { id: 'sleep', name: 'Log 8 Hrs Sleep', done: false }
];

// --- DEFAULT DATA (Used for first-time load only) ---
// Using neutral, non-cringey descriptions
const DEFAULT_SCHEDULE = [
    { id: 1, start: 800, end: 900, description: 'Morning Routine & Fuel Check' },
    { id: 2, start: 900, end: 1200, description: 'Deep Work: CS Project' },
    { id: 3, start: 1200, end: 1300, description: 'Refuel & Wellness Break' },
    { id: 4, start: 1300, end: 1600, description: 'Asynchronous Study: History' },
    { id: 5, start: 1600, end: 1800, description: 'Social Hour/Clubs' },
    { id: 6, start: 1800, end: 1900, description: 'Dinner & Review Log' },
    { id: 7, start: 1900, end: 2200, description: 'Final Boost/Prep for Tomorrow' }
];


document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Load all persistent data and start continuous updates
    loadData();
    updateTime();
    setInterval(updateTime, 1000);
    updateScheduleHighlight();
    setInterval(updateScheduleHighlight, 60000); // Check schedule every minute
    setupListeners();
    fetchAstronomyPicture();
    startCountdown();
});

// --- CORE UTILITY FUNCTIONS ---

function loadData() {
    loadTasks();
    loadNotes();
    loadHabits();
    loadSchedule();
}

function setupListeners() {
    // Task Management
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('new-task').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    document.getElementById('todo-list').addEventListener('click', toggleTaskCompletion);

    // Schedule Management
    document.getElementById('schedule-list').addEventListener('click', handleScheduleClick);
    document.getElementById('add-schedule-btn').addEventListener('click', addScheduleEntry); // New listener for adding

    // Notes Persistence (Save 1 second after typing stops)
    let notesTimeout;
    document.getElementById('cosmic-notes').addEventListener('input', () => {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(saveNotes, 1000);
    });
}

// --- 1. CLOCK & DATE (GALACTIC CLOCK) ---

function updateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const timeString = now.toLocaleTimeString('en-US', timeOptions);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);

    document.getElementById('datetime-display').textContent = timeString;
    document.getElementById('date-display').textContent = dateString;
}

// --- 2. DAILY SCHEDULE HIGHLIGHT (PLANETARY FOCUS) ---

function updateScheduleHighlight() {
    const scheduleData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SCHEDULE) || '[]');
    if (scheduleData.length === 0) return;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 100 + minute; // e.g., 9:30 AM -> 930

    const scheduleItems = document.getElementById('schedule-list').children;

    for (let i = 0; i < scheduleItems.length; i++) {
        const item = scheduleItems[i];
        const entry = scheduleData[i];

        item.classList.remove('current-focus');

        // Check if the current time falls within the schedule block
        if (currentTime >= entry.start && currentTime < entry.end) {
            item.classList.add('current-focus');
        }
    }
}

// --- 3. SCHEDULE MANAGEMENT FUNCTIONS (EDITABLE) ---

function formatTime(time) {
    // Converts 800 -> 08:00 (24 hour format)
    const h = Math.floor(time / 100);
    const m = time % 100;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function loadSchedule() {
    let schedule = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SCHEDULE) || 'null');

    // Initialize with default schedule if storage is empty
    if (!schedule || schedule.length === 0) {
        schedule = DEFAULT_SCHEDULE;
        localStorage.setItem(LOCAL_STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    }
    renderSchedule(schedule);
}

function saveSchedule(scheduleData) {
    // Sort by start time before saving
    const sortedSchedule = scheduleData.sort((a, b) => a.start - b.start);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SCHEDULE, JSON.stringify(sortedSchedule));
    renderSchedule(sortedSchedule);
    updateScheduleHighlight();
}

function renderSchedule(scheduleData) {
    const ul = document.getElementById('schedule-list');
    ul.innerHTML = '';

    if (scheduleData.length === 0) {
        ul.innerHTML = '<li class="p-2 text-gray-500 italic text-sm">Schedule is clear. Add an entry below!</li>';
        return;
    }

    scheduleData.forEach(entry => {
        const li = document.createElement('li');
        li.setAttribute('data-id', entry.id);
        li.className = 'schedule-item flex justify-between group cursor-pointer hover:bg-gray-800 p-2 -mx-2 rounded-lg';
        li.innerHTML = `
            <div class="flex-grow">
                <span class="font-semibold text-gray-300">${formatTime(entry.start)} - ${formatTime(entry.end)}</span>
                <span class="text-gray-500 block">${entry.description}</span>
            </div>
            <button data-action="delete-schedule" data-id="${entry.id}" class="text-gray-500 hover:text-red-400 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;
        ul.appendChild(li);
    });

    lucide.createIcons();
}

function handleScheduleClick(event) {
    const target = event.target.closest('[data-action="delete-schedule"]');
    if (target) {
        const entryId = parseInt(target.getAttribute('data-id'));
        console.log(`[ACTION]: Schedule entry with ID ${entryId} deleted.`);
        deleteScheduleEntry(entryId);
    }
}

function deleteScheduleEntry(id) {
    const schedule = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SCHEDULE) || '[]');
    const updatedSchedule = schedule.filter(entry => entry.id !== id);
    saveSchedule(updatedSchedule);
}

function addScheduleEntry() {
    const startInput = document.getElementById('new-schedule-start');
    const endInput = document.getElementById('new-schedule-end');
    const descInput = document.getElementById('new-schedule-description');

    const start = parseInt(startInput.value);
    const end = parseInt(endInput.value);
    const description = descInput.value.trim();

    if (!start || !end || !description || isNaN(start) || isNaN(end)) {
        console.error("Schedule Error: Please enter valid start time (e.g., 0900), end time, and a description.");
        return;
    }

    if (start >= end) {
        console.error("Schedule Error: Start time must be before end time.");
        return;
    }

    const schedule = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SCHEDULE) || '[]');
    const newEntry = {
        id: Date.now(),
        start: start,
        end: end,
        description: description
    };

    schedule.push(newEntry);
    saveSchedule(schedule);

    // Clear inputs after successful addition
    startInput.value = '';
    endInput.value = '';
    descInput.value = '';
}


// --- 4. TO-DO LIST (ORBITING TASKS) ---

function loadTasks() {
    const allTasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TASKS) || '[]');
    const tasks = allTasks.sort((a, b) => a.completed - b.completed);
    const ul = document.getElementById('todo-list');
    ul.innerHTML = '';

    if (tasks.length === 0) {
         ul.innerHTML = '<li class="p-2 text-gray-500 italic text-sm">No tasks. Time to launch!</li>';
         return;
    }
    tasks.forEach(task => ul.appendChild(createTaskElement(task)));
}

function saveTasks(tasks) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    loadTasks();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.setAttribute('data-id', task.id);
    li.className = 'flex items-center p-2 rounded-lg transition-all duration-300 hover:bg-gray-800';
    li.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''} class="mr-3 w-5 h-5 border-gray-600 rounded focus:ring-pink-500">
        <span class="task-text flex-grow text-sm text-gray-300 ${task.completed ? 'completed' : ''}">${task.text}</span>
        <button data-action="delete" class="text-gray-500 hover:text-red-400 ml-3 transition-colors duration-200">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;
    lucide.createIcons();
    return li;
}

function addTask() {
    const input = document.getElementById('new-task');
    const text = input.value.trim();
    if (text === '') return;

    const tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TASKS) || '[]');
    const newTask = {
        id: Date.now(),
        text: text,
        completed: false
    };
    tasks.push(newTask);
    saveTasks(tasks);
    input.value = '';
}

function toggleTaskCompletion(event) {
    const li = event.target.closest('li');
    if (!li) return;
    const taskId = parseInt(li.getAttribute('data-id'));
    let tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TASKS));

    if (event.target.closest('[data-action="delete"]')) {
        tasks = tasks.filter(t => t.id !== taskId);
    } else {
        const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
            }
        }
        saveTasks(tasks);
}

// --- 5. GOALS COUNTDOWN ---

function startCountdown() {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetDate = new Date(`March 10, ${targetYear} 00:00:00`).getTime();

    if (now.getTime() > targetDate) {
        targetYear++;
        targetDate = new Date(`March 10, ${targetYear} 00:00:00`).getTime();
    }

    const countdownElement = document.getElementById('countdown');

    const countdownInterval = setInterval(function() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownElement.innerHTML = "SPRING BREAK IS HERE!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}


// --- 6. NASA APOD WIDGET ---

async function fetchAstronomyPicture() {
    const imageEl = document.getElementById('apod-image');
    const titleEl = document.getElementById('apod-title');
    const explanationEl = document.getElementById('apod-explanation');
    const loadingMessage = 'Fetching Cosmic Data...';

    titleEl.textContent = loadingMessage;
    imageEl.src = 'https://placehold.co/400x200/222/FFF?text=Fetching+Image';


    try {
        const response = await fetch(NASA_API_URL);
        if (!response.ok) {
            throw new Error(`NASA API returned status ${response.status}`);
        }
        const data = await response.json();

        titleEl.textContent = data.title;

        if (data.media_type === 'video') {
            imageEl.src = data.thumbnail_url || 'https://placehold.co/400x200/A5B4FC/E0E0FF?text=Video+of+Day';
            imageEl.alt = 'Video of the Day Thumbnail';
            explanationEl.textContent = data.explanation.substring(0, 150) + '... (Click to view video)';
        } else {
            imageEl.src = data.hdurl || data.url;
            imageEl.alt = data.title;
            explanationEl.textContent = data.explanation.substring(0, 200) + '...';
        }

    } catch (error) {
        console.error("Failed to fetch APOD:", error);
        titleEl.textContent = 'Cosmic Data Unavailable';
        imageEl.src = 'https://placehold.co/400x200/F472B6/E0E0FF?text=Lost+Contact';
        explanationEl.textContent = 'The telescope is temporarily offline. Please check your connection or try again later.';
    }
}

// --- 7. QUICK LOG (COSMIC NOTES) ---

function loadNotes() {
    const notes = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTES);
    document.getElementById('cosmic-notes').value = notes || '';
}

function saveNotes() {
    const notes = document.getElementById('cosmic-notes').value;
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTES, notes);
}

// --- 8. HABIT TRACKER (STELLAR STREAK) ---

function getCurrentDateKey() {
    return new Date().toISOString().split('T')[0];
}

function loadHabits() {
    const lastResetDate = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_RESET);
    const todayKey = getCurrentDateKey();

    let storedHabits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || 'null');
    let habits = storedHabits || HABITS_CONFIG;

    if (lastResetDate !== todayKey) {
        habits = habits.map(h => ({ ...h, done: false }));
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_RESET, todayKey);
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
    renderHabits(habits);
}

function renderHabits(habits) {
    const tracker = document.getElementById('habit-tracker');
    tracker.innerHTML = '';

    habits.forEach(habit => {
        const buttonText = habit.done ? `<i data-lucide="check" class="w-4 h-4 mr-1"></i> Completed` : 'Check In';

        const habitRow = document.createElement('div');
        habitRow.className = 'habit-row';
        habitRow.innerHTML = `
            <span class="text-sm font-medium text-gray-300">${habit.name}</span>
            <button class="habit-btn text-xs flex items-center ${habit.done ? 'bg-green-500 hover:bg-green-600' : 'bg-pink-400 hover:bg-pink-500'}" data-habit-id="${habit.id}" data-done="${habit.done}">
                ${buttonText}
            </button>
        `;
        tracker.appendChild(habitRow);
    });

    lucide.createIcons();

    tracker.querySelectorAll('.habit-btn').forEach(button => {
        button.addEventListener('click', toggleHabit);
    });
}

function toggleHabit(event) {
    const habitId = event.currentTarget.getAttribute('data-habit-id');
    const isDone = event.currentTarget.getAttribute('data-done') === 'true';

    let habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS));

    habits = habits.map(h => {
        if (h.id === habitId) {
            h.done = !isDone;
        }
        return h;
    });

    localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
    renderHabits(habits);
}
