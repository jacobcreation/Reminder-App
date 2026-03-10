import { LocalNotifications } from '@capacitor/local-notifications';

const form = document.getElementById('reminderForm');
const reminderText = document.getElementById('reminderText');
const reminderTime = document.getElementById('reminderTime');
const remindersList = document.getElementById('remindersList');

let reminders = [];

// Request permission and create channel for notifications on app start
LocalNotifications.requestPermissions().then(result => {
  if (result.display === 'granted') {
    console.log('Notifications permission granted');
    LocalNotifications.createChannel({
      id: 'reminders',
      name: 'Reminders',
      importance: 5,
      description: 'Reminders for your tasks',
      sound: 'default',
      visibility: 1,
      vibration: true
    });
  }
});

form.addEventListener('submit', e => {
  e.preventDefault();

  const text = reminderText.value.trim();
  const timeString = reminderTime.value;

  if (!text || !timeString) {
    alert('Enter valid reminder and time.');
    return;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  let alarm = new Date();
  alarm.setHours(hours, minutes, 0, 0);
  if (alarm <= now) alarm.setDate(alarm.getDate() + 1);

  const id = Math.floor(Math.random() * 1000000); // 32-bit safe ID
  const reminder = {
    id,
    text,
    alarm,
    interval: null
  };

  addReminderToList(reminder);
  scheduleNotification(reminder);
  form.reset();
});

function addReminderToList(reminder) {
  const reminderItem = document.createElement('div');
  reminderItem.className = 'reminder-item';
  reminderItem.id = `reminder-${reminder.id}`;

  reminderItem.innerHTML = `
    <div class="reminder-content">
      <div class="reminder-info">
        <span class="reminder-text">${reminder.text}</span>
        <span class="reminder-target-time">At ${reminder.alarm.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="reminder-timer" id="timer-${reminder.id}">⏳ Calculating...</div>
    </div>
    <button class="btn-delete" onclick="deleteReminder(${reminder.id})">✕</button>
  `;

  remindersList.appendChild(reminderItem);
  reminders.push(reminder);

  updateReminder(reminder);
  reminder.interval = setInterval(() => updateReminder(reminder), 1000);
}

function updateReminder(reminder) {
  const timerElement = document.getElementById(`timer-${reminder.id}`);
  if (!timerElement) return;

  const now = new Date();
  let timeLeft = Math.floor((reminder.alarm - now) / 1000);

  if (timeLeft <= 0) {
    clearInterval(reminder.interval);
    timerElement.textContent = '⏰ Time Up!';
    timerElement.classList.add('time-up');
  } else {
    timerElement.textContent = formatTime(timeLeft);
  }
}

async function scheduleNotification(reminder) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Reminder!',
          body: reminder.text,
          id: reminder.id,
          schedule: { at: reminder.alarm, allowWhileIdle: true },
          sound: 'default',
          channelId: 'reminders',
          actionTypeId: '',
          extra: null
        }
      ]
    });
    console.log(`Scheduled notification ${reminder.id} at ${reminder.alarm}`);
  } catch (err) {
    console.error('Notification failed:', err);
  }
}

function deleteReminder(id) {
  const index = reminders.findIndex(r => r.id === id);
  if (index !== -1) {
    clearInterval(reminders[index].interval);
    LocalNotifications.cancel({ notifications: [{ id }] });
    reminders.splice(index, 1);
  }
  const element = document.getElementById(`reminder-${id}`);
  if (element) {
    element.remove();
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `⏳ ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
