"use client";
import { createSlice } from "@reduxjs/toolkit";
import { createSelector } from "@reduxjs/toolkit";

const initialState = {
  byId: {}, // { [draftId]: { ...offerClone } }
  selection: {
    order: [],
    byId: {}
  },
  alreadySent: {
    accepted: [], 
    rejected: []
  }
};

const selectSelectionIds = (s) => s.drafts?.selection?.order ?? [];
const selectSelectionMap = (s) => s.drafts?.selection?.byId ?? {};

function ensureSelection(state){
    if(!state.selection) state.selection = { order: [], byId: {} };
    if(!Array.isArray(state.selection.order)) state.selection.order = [];
    if(!state.selection.byId) state.selection.byId = {};
  }

const draftsSlice = createSlice({
  name: "drafts",
  initialState,
  reducers: {
    replaceDraft: (state, action) => {
      const { id, data } = action.payload;
      state.byId[id] = data;
    },
    resetDraft: (state, action) => {
      const { id } = action.payload;
      delete state.byId[id];
    },
    queueUp:(state,{payload:{id,data}})=>{
        ensureSelection(state);
        state.selection.byId[id]=data; 
        if(!state.selection.order.includes(id)) state.selection.order.push(id);
    },
    queueDrop:(state,{payload:{id}})=>{
      ensureSelection(state);
      delete state.selection.byId[id];
      state.selection.order = state.selection.order.filter(x=>x!==id);
    },
    clearSelection:(state)=>{
      ensureSelection(state);
      state.selection.byId = {};
      state.selection.order = [];
    },

    resetSwipe: (state) => {
      state.swiped = {};
    },

    resetAll: () => initialState,

    markAsSent: (state, action) => {
      const { accepted = [], rejected = [] } = action.payload || {};
      if (!state.alreadySent) state.alreadySent = { accepted: [], rejected: [] };
    
      for (const draft of accepted) {
        const id = draft.id;
        state.byId[id] = draft; // on garde l’objet complet
        if (!state.alreadySent.accepted.includes(id)) {
          state.alreadySent.accepted.push(id);
        }
      }
    
      for (const draft of rejected) {
        const id = draft.id;
        state.byId[id] = draft; // idem côté rejet
        if (!state.alreadySent.rejected.includes(id)) {
          state.alreadySent.rejected.push(id);
        }
      }
    },
      
  },
});

export const {
    replaceDraft, resetDraft, queueUp, queueDrop, clearSelection,resetSwipe, resetAll, markAsSent
  } = draftsSlice.actions;

  export const selectDraftById = (s,id)=> s.drafts?.byId?.[id];
  export const selectSelectionCount = createSelector(
    [selectSelectionIds],
    (ids) => ids.length
  );
  export const selectSelectionList = createSelector(
    [selectSelectionIds, selectSelectionMap],
    (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
  );

export default draftsSlice.reducer;