import type { StateCreator } from "zustand";
import type { ChatStore, CreateActions } from "../../types";

export const createCreateSlice: StateCreator<ChatStore, [], [], CreateActions> = (set) => ({
  bumpBookDataVersion: () => set((s) => ({ bookDataVersion: s.bookDataVersion + 1 })),
  openArtifact: (file) => set({ sidebarView: "artifact", artifactFile: file, artifactChapter: null }),
  openChapterArtifact: (chapterNum) => set({ sidebarView: "artifact", artifactFile: null, artifactChapter: chapterNum }),
  closeArtifact: () => set({ sidebarView: "panel", artifactFile: null, artifactChapter: null }),
  setBookSummary: (summary) => set({ bookSummary: summary }),
});
