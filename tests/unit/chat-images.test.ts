import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_IMAGE_BYTES,
  chatImagePath,
  chatImageProblem,
  isChatImagePathFor,
} from "@/lib/chat-images";

const CONV = "0b8f6f4e-3c1a-4d2e-9f00-1a2b3c4d5e6f";
const FILE = "7d9e2c11-5a4b-4c3d-8e2f-6a7b8c9d0e1f";

describe("chatImageProblem", () => {
  it("accepts a normal photo", () => {
    expect(chatImageProblem({ type: "image/jpeg", size: 200_000 })).toBeNull();
  });

  it("rejects non-image types", () => {
    expect(chatImageProblem({ type: "application/pdf", size: 10 })).toMatch(/JPEG/);
    expect(chatImageProblem({ type: "image/svg+xml", size: 10 })).toMatch(/JPEG/);
  });

  it("rejects files over the size limit", () => {
    expect(chatImageProblem({ type: "image/png", size: MAX_CHAT_IMAGE_BYTES + 1 })).toMatch(/5 MB/);
    expect(chatImageProblem({ type: "image/png", size: MAX_CHAT_IMAGE_BYTES })).toBeNull();
  });
});

describe("chat image paths", () => {
  it("builds <conversation>/<id>.<ext>", () => {
    expect(chatImagePath(CONV, "image/webp", FILE)).toBe(`${CONV}/${FILE}.webp`);
  });

  it("accepts a path in the same conversation", () => {
    expect(isChatImagePathFor(`${CONV}/${FILE}.jpg`, CONV)).toBe(true);
  });

  it("rejects paths in another conversation or with tricks", () => {
    const other = "11111111-2222-4333-8444-555555555555";
    expect(isChatImagePathFor(`${other}/${FILE}.jpg`, CONV)).toBe(false);
    expect(isChatImagePathFor(`${CONV}/../${other}/${FILE}.jpg`, CONV)).toBe(false);
    expect(isChatImagePathFor(`${CONV}/${FILE}.svg`, CONV)).toBe(false);
    expect(isChatImagePathFor(undefined, CONV)).toBe(false);
  });
});
