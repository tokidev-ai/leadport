import { readFileSync } from "node:fs";
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "leadport-rules-test",
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterEach(async () => {
  await testEnv.clearStorage();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const ALICE = "alice";
const BOB = "bob";

const smallImage = { data: new Uint8Array([1, 2, 3]), contentType: "image/png" };
const oversizedImage = {
  data: new Uint8Array(11 * 1024 * 1024), // 11MB, over the 10MB cap
  contentType: "image/png",
};
const nonImage = { data: new Uint8Array([1, 2, 3]), contentType: "application/pdf" };

describe("storage: users/{uid}/*", () => {
  it("owner can upload an image under their own path", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const fileRef = ref(alice.storage(), `users/${ALICE}/avatar.png`);
    await assertSucceeds(
      uploadBytes(fileRef, smallImage.data, { contentType: smallImage.contentType }),
    );
  });

  it("another authenticated user cannot upload under someone else's path", async () => {
    const bob = testEnv.authenticatedContext(BOB);
    const fileRef = ref(bob.storage(), `users/${ALICE}/avatar.png`);
    await assertFails(
      uploadBytes(fileRef, smallImage.data, { contentType: smallImage.contentType }),
    );
  });

  it("anonymous cannot upload anywhere", async () => {
    const anon = testEnv.unauthenticatedContext();
    const fileRef = ref(anon.storage(), `users/${ALICE}/avatar.png`);
    await assertFails(
      uploadBytes(fileRef, smallImage.data, { contentType: smallImage.contentType }),
    );
  });

  it("rejects an upload over 10MB", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const fileRef = ref(alice.storage(), `users/${ALICE}/huge.png`);
    await assertFails(
      uploadBytes(fileRef, oversizedImage.data, {
        contentType: oversizedImage.contentType,
      }),
    );
  });

  it("rejects a non-image content type", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const fileRef = ref(alice.storage(), `users/${ALICE}/doc.pdf`);
    await assertFails(
      uploadBytes(fileRef, nonImage.data, { contentType: nonImage.contentType }),
    );
  });

  it("anyone, including anonymous, can read an uploaded image (public profile photos)", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const ownerFileRef = ref(alice.storage(), `users/${ALICE}/avatar.png`);
    await uploadBytes(ownerFileRef, smallImage.data, {
      contentType: smallImage.contentType,
    });

    const anon = testEnv.unauthenticatedContext();
    const anonFileRef = ref(anon.storage(), `users/${ALICE}/avatar.png`);
    await assertSucceeds(getBytes(anonFileRef));
  });
});

describe("storage: unmatched paths", () => {
  it("denies read and write outside users/{uid}/*", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const fileRef = ref(alice.storage(), "other/somewhere.png");
    await assertFails(
      uploadBytes(fileRef, smallImage.data, { contentType: smallImage.contentType }),
    );
    await assertFails(getBytes(fileRef));
  });
});
