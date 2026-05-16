import { get, set, del } from "idb-keyval";

const VIDEO_KEY = "pending_video_file";
const MASK_KEY = "pending_mask_blob";

export const filePersistence = {
  async saveVideo(file: File) {
    try {
      await set(VIDEO_KEY, file);
    } catch (e) {
      console.error(e);
    }
  },
  async getVideo(): Promise<File | null> {
    try {
      const file = await get(VIDEO_KEY);
      return file instanceof File ? file : null;
    } catch (e) {
      return null;
    }
  },
  async saveMask(blob: Blob) {
    try {
      await set(MASK_KEY, blob);
    } catch (e) {
      console.error(e);
    }
  },
  async getMask(): Promise<Blob | null> {
    try {
      const blob = await get(MASK_KEY);
      return blob instanceof Blob ? blob : null;
    } catch (e) {
      return null;
    }
  },
  async clearMask() {
    await del(MASK_KEY);
  },
  async clearAll() {
    await del(VIDEO_KEY);
    await del(MASK_KEY);
  },
};
