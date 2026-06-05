#!/bin/bash
# ============================================================
# سكريبت نشر على Firebase Hosting — نقرة واحدة
# ============================================================

echo "🚀 بدء النشر على Firebase Hosting..."
echo ""

# التحقق من وجود Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI غير مثبت. جاري التثبيت..."
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        echo "❌ فشل تثبيت Firebase CLI. حاول يدوياً:"
        echo "   npm install -g firebase-tools"
        exit 1
    fi
fi

# التحقق من تسجيل الدخول
echo "🔍 التحقق من تسجيل الدخول..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "🔐 جاري تسجيل الدخول..."
    firebase login
fi

# استخدام المشروع
echo "📁 استخدام المشروع mamoun-05-2026..."
firebase use mamoun-05-2026

# النشر
echo ""
echo "📤 جاري رفع الملفات..."
firebase deploy --only hosting

# النتيجة
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم النشر بنجاح!"
    echo ""
    echo "🔗 الرابط: https://mamoun-05-2026.web.app"
    echo ""
else
    echo ""
    echo "❌ فشل النشر. تحقق من:"
    echo "   1. تسجيل الدخول: firebase login"
    echo "   2. المشروع: firebase projects:list"
    echo "   3. الصلاحيات في Firebase Console"
    echo ""
fi

read -p "اضغط Enter للخروج..."
