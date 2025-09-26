"use client";
import { createContext, useContext, useEffect, useReducer, useRef } from "react";

const KEY = "tinder-jobs:ui";
const initialState = { byId:{}, selection:{ order:[], byId:{} }, alreadySent:{ accepted:[], rejected:[] } };

function reducer(state, action) {
  switch (action.type) {
    case "REHYDRATE": return action.payload || state;
    case "REPLACE_DRAFT": return { ...state, byId: { ...state.byId, [action.id]: action.payload } };
    case "RESET_DRAFT": { const byId = { ...state.byId }; delete byId[action.id]; return { ...state, byId }; }
    case "QUEUE_UP": if (state.selection.byId[action.id]) return state;
      return { ...state, selection: { order:[...state.selection.order, action.id], byId:{ ...state.selection.byId, [action.id]: action.payload } } };
    case "QUEUE_DROP": { if (!state.selection.byId[action.id]) return state;
      const byId = { ...state.selection.byId }; delete byId[action.id];
      return { ...state, selection: { order: state.selection.order.filter(x=>x!==action.id), byId } }; }
    case "CLEAR_SELECTION": return { ...state, selection: { order:[], byId:{} } };
    case "RESET_SWIPE":    return { ...state, alreadySent:{ accepted:[], rejected:[] } };
    case "RESET_ALL":      return initialState;
    case "MARK_AS_SENT": { const list = state.alreadySent[action.status] || [];
      if (list.includes(action.id)) return state;
      return { ...state, alreadySent:{ ...state.alreadySent, [action.status]: [...list, action.id] } }; }
    default: return state;
  }
}

const Ctx = createContext(null);

export function DraftsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // REHYDRATE once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) dispatch({ type:"REHYDRATE", payload: JSON.parse(raw) });
    } finally { hydrated.current = true; }
  }, []);

  // SAVE only after first hydration
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // selectors
  const selectDraftById  = (id) => state.byId?.[id];
  const selectionIds     = state.selection.order;
  const selectionList    = selectionIds.map(id => state.selection.byId[id]).filter(Boolean);
  const selectionCount   = selectionIds.length;

  // actions
  const replaceDraft   = (id, payload) => dispatch({ type:"REPLACE_DRAFT", id, payload });
  const resetDraft     = (id)          => dispatch({ type:"RESET_DRAFT", id });
  const queueUp        = (id, payload) => dispatch({ type:"QUEUE_UP", id, payload });
  const queueDrop      = (id)          => dispatch({ type:"QUEUE_DROP", id });
  const clearSelection = ()            => dispatch({ type:"CLEAR_SELECTION" });
  const resetSwipe     = ()            => dispatch({ type:"RESET_SWIPE" });
  const resetAll       = ()            => dispatch({ type:"RESET_ALL" });
  const markAsSent     = (id, status)  => dispatch({ type:"MARK_AS_SENT", id, status });

  const value = { selectionCount, selectionList, selectDraftById,
                  replaceDraft, resetDraft, queueUp, queueDrop, clearSelection,
                  resetSwipe, resetAll, markAsSent };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrafts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDrafts must be used inside <DraftsProvider>");
  return ctx;
}