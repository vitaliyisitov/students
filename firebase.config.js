/**
 * Конфиг Firebase + инициализация.
 * Подключается после firebase-app-compat.js и firebase-firestore-compat.js.
 * Устанавливает window.db — глобальный экземпляр Firestore.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCOQ_-F1nyl6aWuIQDVcBuwehqWGDC19EY",
  authDomain: "cabinet-students.firebaseapp.com",
  projectId: "cabinet-students",
  storageBucket: "cabinet-students.firebasestorage.app",
  messagingSenderId: "161435193609",
  appId: "1:161435193609:web:9caed63bdf677e2b3e83d8",

  // Пустой = без пароля на вход в админку.
  // Задай строку чтобы включить защиту: adminGatePassword: "секрет"
  adminGatePassword: "",

  // false = показывать дашборд без ?k= в URL (для отладки)
  requirePersonalLink: true,
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
window.db = firebase.firestore();
