// Planted BAD TEST (labeled, do not copy): later setup supplies the asserted state,
// so this passes even if the protected write is removed. Cannot go red by construction.
// Rev bad-test lane must flag class 2 (wrong supplier), see references/bad-tests.md.
import { test } from "node:test";
import assert from "node:assert/strict";

let store = {};
function protectedWrite() { store.pin = "from-write"; }
function laterSetup() { store.pin = "from-write"; } // supplies same value, later

test("pin preserved (BAD: insensitive)", () => {
  protectedWrite();
  laterSetup(); // <-- masks deletion of protectedWrite
  assert.equal(store.pin, "from-write");
});
