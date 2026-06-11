import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const form = document.getElementById('reminderForm');
const reminderText = document.getElementById('reminderText');
const reminderTime = document.getElementById('reminderTime');
const remindersList = document.getElementById('remindersList');

let reminders = [];
const notificationIds = new Map();
const REMINDER_CHANNEL_ID = 'reminders_beep_v1';
const REMINDER_SOUND = 'reminder_beep.wav';

// Initialize Local Notifications
async function initNotifications() {
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    console.warn('Notification permission not granted');
  }

  // Create a channel for Android (required for sound and importance)
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Reminders',
    description: 'Reminder notifications',
    importance: 5, // Max importance for sound/heads-up
    visibility: 1,
    sound: REMINDER_SOUND,
    vibration: true
  });
}
initNotifications();

form.addEventListener('submit', async e => {
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

  const id = Math.floor(Math.random() * 1000000);
  const reminder = {
    id,
    text,
    alarm,
    interval: null
  };

  addReminderToList(reminder);
  await scheduleNotification(reminder);
  
  // Haptic feedback
  await Haptics.impact({ style: ImpactStyle.Medium });
  
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
          title: "JacobReminder",
          body: reminder.text,
          id: reminder.id,
          schedule: { at: reminder.alarm },
          channelId: REMINDER_CHANNEL_ID,
          sound: REMINDER_SOUND,
          attachments: null,
          actionTypeId: "",
          extra: null
        }
      ]
    });
    console.log(`Scheduled notification ${reminder.id} at ${reminder.alarm}`);
  } catch (err) {
    console.error('Notification scheduling failed:', err);
  }
}

async function deleteReminder(id) {
  const index = reminders.findIndex(r => r.id === id);
  if (index !== -1) {
    clearInterval(reminders[index].interval);
    reminders.splice(index, 1);
  }

  // Cancel scheduled notification
  try {
    await LocalNotifications.cancel({
      notifications: [{ id }]
    });
  } catch (err) {
    console.warn('Could not cancel notification', err);
  }

  const element = document.getElementById(`reminder-${id}`);
  if (element) {
    element.remove();
  }

  // Haptic feedback
  await Haptics.impact({ style: ImpactStyle.Light });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `⏳ ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

window.deleteReminder = deleteReminder;
