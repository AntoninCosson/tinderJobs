"use client";
import { createSlice } from "@reduxjs/toolkit";
import { createSelector } from "@reduxjs/toolkit";

const initialState = {
  byId: {}, // { [draftId]: { ...offerClone } }
  selection: {
    order: [],
    byId: {}
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
      resetAll: () => initialState,
  },
});

export const {
    replaceDraft, resetDraft, queueUp, queueDrop, clearSelection, resetAll
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