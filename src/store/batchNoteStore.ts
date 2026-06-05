// ============================================================
// Batch Notes Store — ملاحظات الدفعات (شات + حالة)
// ============================================================

import { create } from 'zustand';
import { db } from '@/firebase/config';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import type { BatchNote, BatchNoteReply, NoteStatus } from '@/types';
import { toast } from 'sonner';

/** Strip undefined values — Firestore rejects them */
function clean(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(clean).filter((v) => v !== undefined);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = typeof v === 'object' ? clean(v) : v;
  }
  return out;
}

interface BatchNoteState {
  notes: BatchNote[];
  isLoading: boolean;
  subscribe: (batchId: string) => () => void;
  addNote: (note: Omit<BatchNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addReply: (noteId: string, reply: Omit<BatchNoteReply, 'id' | 'createdAt'>) => Promise<void>;
  updateNoteStatus: (noteId: string, status: NoteStatus) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

export const useBatchNoteStore = create<BatchNoteState>((set, get) => ({
  notes: [],
  isLoading: false,

  subscribe: (batchId: string) => {
    console.log('[BatchNoteStore] subscribe called, batchId:', batchId);
    if (!batchId) { console.log('[BatchNoteStore] empty batchId, returning noop'); return () => {}; }
    set({ isLoading: true });
    // Use simple where query (no orderBy) to avoid composite index requirement
    const q = query(
      collection(db, 'batchNotes'),
      where('batchId', '==', batchId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const notes: BatchNote[] = [];
      snap.forEach(d => {
        const data = d.data();
        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt;
        const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt;
        notes.push({ id: d.id, ...data, createdAt, updatedAt } as BatchNote);
      });
      // Sort in memory (newest first)
      notes.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      console.log('[BatchNoteStore] onSnapshot fired, notes count:', notes.length);
      set({ notes, isLoading: false });
    }, (err) => {
      console.error('[BatchNoteStore] subscribe error:', err.code, err.message);
      toast?.error('خطأ في تحميل الملاحظات: ' + err.message);
      set({ isLoading: false, notes: [] });
    });
    return unsub;
  },

  addNote: async (note) => {
    console.log('[BatchNoteStore] addNote called, batchId:', note.batchId, 'text:', note.text);
    try {
      const payload = clean({
        batchId: note.batchId,
        text: note.text,
        status: note.status,
        authorId: note.authorId,
        authorName: note.authorName,
        ...(note.authorPhoto ? { authorPhoto: note.authorPhoto } : {}),
        ...(note.images && note.images.length > 0 ? { images: note.images } : {}),
        replies: [],
        createdAt: Timestamp.now().toMillis(),
        updatedAt: Timestamp.now().toMillis(),
      });
      console.log('[BatchNoteStore] addNote payload:', payload);
      const docRef = await addDoc(collection(db, 'batchNotes'), payload);
      console.log('[BatchNoteStore] addNote success, docId:', docRef.id);
    } catch (err: any) {
      console.error('[BatchNoteStore] addNote failed:', err.code, err.message, err);
      throw new Error(err.message || 'فشل إرسال الملاحظة');
    }
  },

  addReply: async (noteId, reply) => {
    const noteRef = doc(db, 'batchNotes', noteId);
    const current = get().notes.find(n => n.id === noteId);
    if (!current) return;
    const replyPayload = clean({
      id: crypto.randomUUID(),
      text: reply.text,
      authorId: reply.authorId,
      authorName: reply.authorName,
      ...(reply.authorPhoto ? { authorPhoto: reply.authorPhoto } : {}),
      ...(reply.images && reply.images.length > 0 ? { images: reply.images } : {}),
      createdAt: Timestamp.now().toMillis(),
    });
    const replies = [...current.replies, replyPayload];
    await updateDoc(noteRef, clean({ replies, updatedAt: Timestamp.now().toMillis() }));
  },

  updateNoteStatus: async (noteId, status) => {
    await updateDoc(doc(db, 'batchNotes', noteId), {
      status,
      updatedAt: Timestamp.now().toMillis(),
    });
  },

  deleteNote: async (noteId) => {
    await deleteDoc(doc(db, 'batchNotes', noteId));
  },
}));

const STATUS_LABELS: Record<NoteStatus, string> = {
  open: 'مفتوحة',
  in_progress: 'جاري العمل',
  done: 'تم',
  rejected: 'مرفوضة',
};

const STATUS_COLORS: Record<NoteStatus, { bg: string; text: string; dot: string }> = {
  open:        { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  done:        { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  rejected:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
};

export { STATUS_LABELS, STATUS_COLORS };
