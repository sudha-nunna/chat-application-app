import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { NobackEndCall } from "../services/authService";

export const fetchAllChatsAction = createAsyncThunk("chat/fetchAllChatsAction", async () => {
  const response = await NobackEndCall("/chats");
  return Array.isArray(response) ? response : response?.data || [];
});

export const loadActiveMessagesAction = createAsyncThunk("chat/loadActiveMessagesAction", async (chatId) => {
  const response = await NobackEndCall(`/chats/${chatId}/messages`);
  return Array.isArray(response) ? response : response?.data || [];
});

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    historyList: [],
    activeChatId: null,
    messagesLog: [],
    isSearchingLoader: false,
    streamingContent: "",
  },
  reducers: {
    setActiveChatIdAction: (state, action) => {
      state.activeChatId = action.payload;
      state.streamingContent = "";
      if (!action.payload) {
        state.messagesLog = [];
      }
    },
    appendLocalUserMessageAction: (state, action) => {
      state.messagesLog.push({ role: "user", content: action.payload });
      state.isSearchingLoader = true;
    },
    setSearchLoaderAction: (state, action) => {
      state.isSearchingLoader = action.payload;
    },
    updateStreamingContentAction: (state, action) => {
      state.streamingContent = action.payload;
    },
    commitFinalAssistantMessageAction: (state, action) => {
      state.messagesLog.push({ role: "assistant", content: action.payload });
      state.streamingContent = "";
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllChatsAction.fulfilled, (state, action) => {
        state.historyList = action.payload;
      })
      .addCase(loadActiveMessagesAction.fulfilled, (state, action) => {
        state.messagesLog = action.payload;
      });
  }
});

export const {
  setActiveChatIdAction,
  appendLocalUserMessageAction,
  setSearchLoaderAction,
  updateStreamingContentAction,
  commitFinalAssistantMessageAction
} = chatSlice.actions;

export default chatSlice.reducer;