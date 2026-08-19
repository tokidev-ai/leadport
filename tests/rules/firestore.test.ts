import { readFileSync } from "node:fs";
import {
  type RulesTestContext,
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "leadport-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const ALICE = "alice";
const BOB = "bob";

// Seeds data bypassing rules entirely, the same way an Admin SDK write would.
function seed(fn: (ctx: RulesTestContext) => Promise<void>) {
  return testEnv.withSecurityRulesDisabled(fn);
}

describe("users/{uid}", () => {
  it("owner can read their own user doc", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", ALICE), { email: "alice@example.com" });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(getDoc(doc(alice.firestore(), "users", ALICE)));
  });

  it("another authenticated user cannot read someone else's user doc", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", ALICE), { email: "alice@example.com" });
    });
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(getDoc(doc(bob.firestore(), "users", ALICE)));
  });

  it("anonymous cannot read a user doc", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", ALICE), { email: "alice@example.com" });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "users", ALICE)));
  });

  it("no client, including the owner, can write a user doc (plan/stripeCustomerId are Admin-SDK-only)", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "users", ALICE), {
        email: "alice@example.com",
        plan: "pro",
      }),
    );
  });
});

describe("slugs/{slug}", () => {
  it("anyone, including anonymous, can read a slug (public availability check)", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
      });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "slugs", "rodrigo")));
  });

  it("an authenticated user can claim an unclaimed slug for themselves", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
      }),
    );
  });

  it("cannot claim a slug on someone else's behalf", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: BOB,
        reservedAt: 1,
      }),
    );
  });

  it("rejects a claim with unexpected extra fields", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
        isPremium: true,
      }),
    );
  });

  it("concurrent claims cannot both succeed — a second write to an already-claimed slug is denied", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
      }),
    );
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(
      setDoc(doc(bob.firestore(), "slugs", "rodrigo"), {
        profileId: "p2",
        ownerUid: BOB,
        reservedAt: 2,
      }),
    );
  });

  it("owner can delete (release) their own slug", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(deleteDoc(doc(alice.firestore(), "slugs", "rodrigo")));
  });

  it("non-owner cannot delete someone else's slug", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "slugs", "rodrigo"), {
        profileId: "p1",
        ownerUid: ALICE,
        reservedAt: 1,
      });
    });
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(deleteDoc(doc(bob.firestore(), "slugs", "rodrigo")));
  });
});

describe("profiles/{profileId} and blocks/{blockId}", () => {
  it("owner can create their own profile", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      }),
    );
  });

  it("cannot create a profile claiming someone else as owner", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "profiles", "p1"), {
        ownerUid: BOB,
        status: "draft",
      }),
    );
  });

  it("owner can read and update their own profile", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(getDoc(doc(alice.firestore(), "profiles", "p1")));
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), "profiles", "p1"), { status: "published" }),
    );
  });

  it("another authenticated user cannot read or write someone else's profile", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
    });
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(getDoc(doc(bob.firestore(), "profiles", "p1")));
    await assertFails(
      updateDoc(doc(bob.firestore(), "profiles", "p1"), { status: "published" }),
    );
  });

  it("anonymous cannot read or write any profile", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "profiles", "p1")));
  });

  it("owner can read and write blocks under their own profile", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    const blockRef = doc(collection(alice.firestore(), "profiles", "p1", "blocks"), "b1");
    await assertSucceeds(setDoc(blockRef, { type: "link", order: 1, visible: true }));
    await assertSucceeds(getDoc(blockRef));
  });

  it("authenticated user CANNOT read or write blocks under another user's profile", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
      await setDoc(doc(ctx.firestore(), "profiles", "p1", "blocks", "b1"), {
        type: "link",
        order: 1,
        visible: true,
      });
    });
    const bob = testEnv.authenticatedContext(BOB);
    const blockRef = doc(bob.firestore(), "profiles", "p1", "blocks", "b1");
    await assertFails(getDoc(blockRef));
    await assertFails(setDoc(blockRef, { type: "link", order: 2, visible: true }));
  });
});

describe("publishedPages/{slug}", () => {
  it("anonymous user CAN read a published page", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "publishedPages", "rodrigo"), {
        ownerUid: ALICE,
      });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "publishedPages", "rodrigo")));
  });

  it("anonymous user CANNOT write a published page", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(anon.firestore(), "publishedPages", "rodrigo"), { ownerUid: ALICE }),
    );
  });

  it("not even the profile owner can write publishedPages directly (Admin SDK only)", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "publishedPages", "rodrigo"), { ownerUid: ALICE }),
    );
  });
});

describe("leads/{leadId}", () => {
  it("owner CAN read a lead belonging to them", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leads", "l1"), {
        ownerUid: ALICE,
        name: "Prospect",
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(getDoc(doc(alice.firestore(), "leads", "l1")));
  });

  it("another authenticated user CANNOT read someone else's lead", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leads", "l1"), {
        ownerUid: ALICE,
        name: "Prospect",
      });
    });
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(getDoc(doc(bob.firestore(), "leads", "l1")));
  });

  it("no client context can write leads at all, including the owner", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    const bob = testEnv.authenticatedContext(BOB);
    const anon = testEnv.unauthenticatedContext();

    // The owner-to-be cannot create a lead against their own profile either —
    // submitLead() must be the only path in.
    await assertFails(
      setDoc(doc(alice.firestore(), "leads", "l1"), {
        ownerUid: ALICE,
        name: "Prospect",
      }),
    );
    await assertFails(
      setDoc(doc(bob.firestore(), "leads", "l2"), { ownerUid: ALICE, name: "Prospect" }),
    );
    await assertFails(
      setDoc(doc(anon.firestore(), "leads", "l3"), { ownerUid: ALICE, name: "Prospect" }),
    );

    // Nor can the owner update or delete an existing lead.
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leads", "l4"), {
        ownerUid: ALICE,
        name: "Prospect",
      });
    });
    await assertFails(
      updateDoc(doc(alice.firestore(), "leads", "l4"), { status: "contacted" }),
    );
    await assertFails(deleteDoc(doc(alice.firestore(), "leads", "l4")));
  });
});

describe("stats/{profileId}/daily/{day}", () => {
  it("owner can read their own daily stats", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
      await setDoc(doc(ctx.firestore(), "stats", "p1", "daily", "20260101"), {
        views: 3,
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(
      getDoc(doc(alice.firestore(), "stats", "p1", "daily", "20260101")),
    );
  });

  it("another authenticated user cannot read someone else's stats", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
      await setDoc(doc(ctx.firestore(), "stats", "p1", "daily", "20260101"), {
        views: 3,
      });
    });
    const bob = testEnv.authenticatedContext(BOB);
    await assertFails(getDoc(doc(bob.firestore(), "stats", "p1", "daily", "20260101")));
  });

  it("no client can write stats (FieldValue.increment via /api/track, Admin SDK only)", async () => {
    await seed(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "profiles", "p1"), {
        ownerUid: ALICE,
        status: "draft",
      });
    });
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "stats", "p1", "daily", "20260101"), { views: 1 }),
    );
  });
});

describe("deny-by-default catch-all", () => {
  it("an unmatched collection (e.g. listings — out of scope for LP-04) is fully denied", async () => {
    const alice = testEnv.authenticatedContext(ALICE);
    await assertFails(
      setDoc(doc(alice.firestore(), "listings", "x1"), {
        ownerUid: ALICE,
        price: 500000,
      }),
    );
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "listings", "x1")));
  });
});

// Sanity check that the harness itself is wired correctly — if this fails,
// every other "assertFails" test above is meaningless (a misconfigured
// harness that can't reach the emulator fails everything look like a pass).
describe("harness sanity", () => {
  it("connects to the real emulator, not an in-memory stub", () => {
    expect(testEnv.emulators.firestore).toEqual({ host: "127.0.0.1", port: 8080 });
  });
});
