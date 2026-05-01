window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCOQ_-F1nyl6aWuIQDVcBuwehqWGDC19EY",
  authDomain: "cabinet-students.firebaseapp.com",
  projectId: "cabinet-students",
  storageBucket: "cabinet-students.firebasestorage.app",
  messagingSenderId: "161435193609",
  appId: "1:161435193609:web:9caed63bdf677e2b3e83d8",

  // Твой Google-email. Только этот аккаунт получит доступ к admin.html и setup.html.
  // Пустая строка = любой вошедший Google-аккаунт имеет доступ (не рекомендуется).
  adminEmail: "vitalikisitov@gmail.com",

  // false = показывать дашборд без ?k= в URL (для отладки)
  requirePersonalLink: true,
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
window.db = firebase.firestore();
