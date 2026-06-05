// ============================================================
// BatchNotes — Chat-style notes with status, replies, images
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBatchNoteStore, STATUS_LABELS, STATUS_COLORS } from '@/store/batchNoteStore';
import type { NoteStatus, BatchNoteReply } from '@/types';
import {
  X, Send, MessageSquare, CheckCircle, Clock, AlertCircle,
  XCircle, ChevronDown, Paperclip, ImageIcon, Reply, Trash2, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from 'sonner';

interface BatchNotesProps {
  batchId: string;
  batchName: string;
  open: boolean;
  onClose: () => void;
}

export default function BatchNotes({ batchId, batchName, open, onClose }: BatchNotesProps) {
  const { user } = useAuthStore();
  const { notes, subscribe, addNote, addReply, updateNoteStatus, deleteNote } = useBatchNoteStore();

  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'all'>('all');
  const imgHook = useImageUpload();
  const replyImgHook = useImageUpload();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imgHook.image) {
      setImages(prev => [...prev, imgHook.image!]);
      imgHook.clearImage();
    }
  }, [imgHook.image]);

  useEffect(() => {
    if (replyImgHook.image) {
      setReplyImages(prev => [...prev, replyImgHook.image!]);
      replyImgHook.clearImage();
    }
  }, [replyImgHook.image]);

  useEffect(() => {
    if (!open || !batchId) return;
    const unsub = subscribe(batchId);
    return () => unsub();
  }, [open, batchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleAddNote = async () => {
    console.log('[BatchNotes] handleAddNote called, text:', text.trim(), 'user:', user, 'batchId:', batchId);
    if (!text.trim()) {
      console.log('[BatchNotes] text empty, returning');
      return;
    }
    if (!user) {
      console.log('[BatchNotes] user is null/undefined, returning');
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    if (!batchId) {
      console.log('[BatchNotes] batchId is empty, returning');
      toast.error('معرف الدفعة غير موجود');
      return;
    }
    try {
      console.log('[BatchNotes] calling addNote with:', { batchId, text: text.trim(), userId: user.id });
      await addNote({
        batchId,
        text: text.trim(),
        status: 'open',
        authorId: user.id,
        authorName: user.name || user.email || 'مستخدم',
        authorPhoto: user.photoURL,
        images: images.length > 0 ? images : undefined,
        replies: [],
      });
      console.log('[BatchNotes] addNote succeeded');
      setText('');
      setImages([]);
      toast.success('تم إرسال الملاحظة');
    } catch (err: any) {
      console.error('[BatchNotes] addNote error:', err);
      toast.error('فشل إرسال الملاحظة: ' + (err.message || 'تحقق من الاتصال'));
    }
  };

  const handleReply = async (noteId: string) => {
    console.log('[BatchNotes] handleReply called, noteId:', noteId, 'replyText:', replyText.trim());
    if (!replyText.trim()) { console.log('[BatchNotes] replyText empty'); return; }
    if (!user) { console.log('[BatchNotes] user null in reply'); toast.error('يجب تسجيل الدخول'); return; }
    try {
      await addReply(noteId, {
        text: replyText.trim(),
        authorId: user.id,
        authorName: user.name || user.email || 'مستخدم',
        authorPhoto: user.photoURL,
        images: replyImages.length > 0 ? replyImages : undefined,
      });
      setReplyText('');
      setReplyImages([]);
      setReplyTo(null);
      toast.success('تم إرسال الرد');
    } catch (err: any) {
      console.error('[BatchNotes] addReply error:', err);
      toast.error('فشل إرسال الرد: ' + (err.message || 'تحقق من الاتصال'));
    }
  };

  const handleStatusChange = async (noteId: string, status: NoteStatus) => {
    try {
      await updateNoteStatus(noteId, status);
      toast.success('تم تحديث الحالة');
    } catch (err: any) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('حذف الملاحظة؟')) return;
    try {
      await deleteNote(noteId);
      toast.success('تم الحذف');
    } catch (err: any) {
      toast.error('فشل الحذف');
    }
  };

  const filteredNotes = statusFilter === 'all'
    ? notes
    : notes.filter(n => n.status === statusFilter);

  const statusCounts = {
    open: notes.filter(n => n.status === 'open').length,
    in_progress: notes.filter(n => n.status === 'in_progress').length,
    done: notes.filter(n => n.status === 'done').length,
    rejected: notes.filter(n => n.status === 'rejected').length,
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">ملاحظات الدفعة</h3>
            <span className="text-xs text-gray-400">{batchName}</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{notes.length}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Status filters */}
        <div className="flex gap-1 p-3 border-b overflow-x-auto flex-shrink-0">
          {(['all', 'open', 'in_progress', 'done', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === s ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_LABELS[s]} ({s === 'all' ? notes.length : statusCounts[s]})
            </button>
          ))}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">لا توجد ملاحظات</p>
              <p className="text-[11px] text-gray-300 mt-1">أضف أول ملاحظة</p>
            </div>
          ) : (
            filteredNotes.map(note => {
              const st = STATUS_COLORS[note.status];
              const isOwner = user?.id === note.authorId;
              return (
                <div key={note.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {/* Note header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {note.authorName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{note.authorName}</p>
                        <p className="text-[10px] text-gray-400">
                          {note.createdAt ? new Date(note.createdAt).toLocaleString('ar-SA') : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text} flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {STATUS_LABELS[note.status]}
                      </span>
                      {isOwner && (
                        <button onClick={() => handleDelete(note.id)} className="p-1 hover:bg-red-100 rounded">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note text */}
                  <p className="text-sm text-gray-700 mb-2 leading-relaxed">{note.text}</p>

                  {/* Note images */}
                  {note.images && note.images.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                      {note.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                      ))}
                    </div>
                  )}

                  {/* Status actions */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {(['open', 'in_progress', 'done', 'rejected'] as NoteStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(note.id, s)}
                        className={`text-[9px] px-2 py-1 rounded-full transition-colors ${
                          note.status === s ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} font-bold` : 'bg-white text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Replies */}
                  {note.replies.length > 0 && (
                    <div className="border-r-2 border-gray-200 pr-3 mr-2 space-y-2 mb-3">
                      {note.replies.map((reply: BatchNoteReply) => (
                        <div key={reply.id} className="bg-white rounded-lg p-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                              {reply.authorName?.charAt(0) || '?'}
                            </div>
                            <span className="text-[10px] font-bold text-gray-700">{reply.authorName}</span>
                            <span className="text-[9px] text-gray-400">
                              {reply.createdAt ? new Date(reply.createdAt).toLocaleString('ar-SA') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{reply.text}</p>
                          {reply.images && reply.images.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {reply.images.map((img, i) => (
                                <img key={i} src={img} alt="" className="w-12 h-12 object-cover rounded border" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply button/form */}
                  {replyTo === note.id ? (
                    <div className="mt-2">
                      {replyImages.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto">
                          {replyImages.map((img, i) => (
                            <div key={i} className="relative">
                              <img src={img} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                              <button onClick={() => setReplyImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="اكتب رد..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="text-xs flex-1"
                          onKeyDown={e => e.key === 'Enter' && handleReply(note.id)}
                        />
                        <label className="h-9 w-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors flex-shrink-0">
                          <input type="file" accept="image/*" className="hidden" onChange={replyImgHook.handleUpload} />
                          {replyImgHook.isCompressing ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" /> : <Paperclip className="w-4 h-4 text-gray-500" />}
                        </label>
                        <button
                          onClick={() => handleReply(note.id)}
                          className="h-9 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 text-xs flex-shrink-0"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => { setReplyTo(null); setReplyImages([]); }} className="text-[10px] text-gray-400 hover:text-gray-600">إلغاء</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyTo(note.id)}
                      className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Reply className="w-3 h-3" /> رد
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* New note form */}
        <div className="p-4 border-t bg-gray-50 flex-shrink-0">
          {images.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="أضف ملاحظة..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            />
            <label className="h-9 w-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors flex-shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={imgHook.handleUpload} />
              {imgHook.isCompressing ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" /> : <Paperclip className="w-4 h-4 text-gray-500" />}
            </label>
            <button
              onClick={handleAddNote}
              disabled={!text.trim()}
              className="h-9 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center gap-1 text-sm font-bold transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" /> إرسال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
