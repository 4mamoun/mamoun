# نشر على Firebase Hosting

## ⚡ الطريقة السريعة (Windows)

### الخطوة 1: تثبيت Node.js
- حمل من: https://nodejs.org (اختر LTS)
- ثبته بنقرات

### الخطوة 2: فتح Terminal
- اضغط `Win + R`
- اكتب `cmd` واضغط Enter

### الخطوة 3: تثبيت Firebase
```bash
npm install -g firebase-tools
```

### الخطوة 4: تسجيل الدخول
```bash
firebase login
```
يفتح متصفح — سجل دخول بحساب Google المرتبط بالمشروع.

### الخطوة 5: النشر
```bash
cd app
firebase deploy --only hosting
```

✅ يفتح مباشرة على: `https://mamoun-05-2026.web.app`

---

## ⚡ الطريقة السريعة (Mac/Linux)

```bash
cd app
chmod +x deploy.sh
./deploy.sh
```

---

## 🔧 إذا واجهت خطأ CSP

في Firebase Console:
1. افتح https://console.firebase.google.com
2. اختار مشروع `mamoun-05-2026`
3. اذهب لـ Hosting
4. اضغط على القناة (Channel)
5. تأكد أن الملفات موجودة

---

## 📧 الأدمن

أول حساب يسجل دخول يصبح **أدمن تلقائياً**.

بعدها كل حساب جديد يروح لـ **قيد الانتظار**.
