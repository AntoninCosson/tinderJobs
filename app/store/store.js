"use client";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import draftsReducer from "./draftsSlice";

import storage from "redux-persist/lib/storage"; // -> localStorage (web)
import { persistReducer, persistStore } from "redux-persist";

const rootReducer = combineReducers({
  drafts: draftsReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["drafts"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false, // requis pour redux-persist
    }),
});

export const persistor = persistStore(store);