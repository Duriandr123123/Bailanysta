import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8787";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Integration test can only target local disposable data");
let checks = 0;
const suffix = Date.now().toString(36);
async function call(
  user,
  path,
  method = "GET",
  body,
  expected = 200,
  extra = {},
) {
  await new Promise((r) => setTimeout(r, 60));
  const headers = {
    ...(user
      ? {
          "oai-authenticated-user-id": user,
          "oai-authenticated-user-email": user + "@example.test",
        }
      : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...extra,
  };
  const r = await fetch(base + "/api/" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  checks++;
  return data;
}
const ids = ["owner", "teacher", "teacher2", "student", "outsider"].map(
  (s) => "qa-" + s + "-" + suffix,
);
const [owner, teacher, teacher2, student, outsider] = ids;
const people = [];
for (const id of ids) people.push((await call(id, "session")).user);
const school = await call(
  owner,
  "schools",
  "POST",
  {
    name: "QA school " + suffix,
    city: "Test",
    description: "Disposable integration test",
  },
  201,
);
await call(
  student,
  "schools/" + school.id + "/members",
  "POST",
  { publicId: people[1].public_id, role: "teacher" },
  403,
);
await call(owner, "schools/" + school.id + "/members", "POST", {
  publicId: people[1].public_id,
  role: "teacher",
});
await call(owner, "schools/" + school.id + "/members", "POST", {
  publicId: people[2].public_id,
  role: "teacher",
});
const cls = await call(
  teacher,
  "channels",
  "POST",
  { schoolId: school.id, name: "10 A" },
  201,
);
await call(
  student,
  "channels",
  "POST",
  { schoolId: school.id, name: "unauthorized" },
  403,
);
await call(
  teacher2,
  "channels/" + cls.id + "/members",
  "POST",
  { publicId: people[3].public_id },
  403,
);
await call(teacher, "channels/" + cls.id + "/members", "POST", {
  publicId: people[3].public_id,
});
await call(outsider, "channels/" + cls.id + "/messages", "GET", undefined, 403);
await call(teacher2, "channels/" + cls.id + "/messages", "GET", undefined, 403);
await call(null, "channels/" + cls.id + "/messages", "GET", undefined, 401);
const chats = await call(student, "channels");
assert.ok(chats.some((c) => c.id === cls.id));
assert.ok(chats.some((c) => c.kind === "school" && c.school_id === school.id));
checks += 2;
await call(
  student,
  "channels/" + cls.id + "/messages",
  "POST",
  { body: "Private message " + suffix },
  201,
);
const messages = await call(teacher, "channels/" + cls.id + "/messages");
assert.ok(messages.some((m) => m.body.includes(suffix)));
checks++;
await call(
  outsider,
  "channels/" + cls.id + "/messages",
  "POST",
  { body: "intrusion" },
  403,
);
await call(
  student,
  "posts",
  "POST",
  { body: "not allowed", schoolId: school.id },
  403,
);
const post = await call(
  teacher,
  "posts",
  "POST",
  { body: "School #qa " + suffix, schoolId: school.id, kind: "achievement" },
  201,
);
await call(student, "posts/" + post.id, "PATCH", { body: "hacked" }, 403);
await call(owner, "posts/" + post.id, "DELETE", {}, 403);
await call(teacher, "posts/" + post.id, "PATCH", {
  body: "Updated #qa " + suffix,
});
await call(student, "posts/" + post.id + "/like", "POST", {});
await call(student, "posts/" + post.id + "/like", "POST", {});
let feed = await call(null, "posts?q=" + suffix);
assert.equal(feed.find((p) => p.id === post.id).likes, 1);
checks++;
await call(
  student,
  "posts/" + post.id + "/comments",
  "POST",
  { body: "Great work" },
  201,
);
assert.equal((await call(null, "posts/" + post.id + "/comments")).length, 1);
checks++;
const notes = await call(teacher, "notifications");
assert.ok(notes.some((n) => n.body.includes("прокомментировал")));
checks++;
await call(student, "posts", "POST", { body: "   " }, 400);
await call(student, "posts", "POST", { body: "cross site" }, 403, {
  Origin: "https://attacker.example",
});
await call(
  student,
  "posts",
  "POST",
  {
    body: "fake file",
    image: "/api/media/00000000-0000-4000-8000-000000000000",
  },
  400,
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const upload = await fetch(base + "/api/upload", {
  method: "POST",
  headers: {
    "Content-Type": "image/png",
    "oai-authenticated-user-id": student,
    "oai-authenticated-user-email": student + "@example.test",
  },
  body: png,
});
assert.equal(upload.status, 200);
checks++;
const media = await upload.json();
assert.equal((await fetch(base + media.url)).status, 404);
checks++;
await call(
  teacher,
  "posts",
  "POST",
  { body: "steal upload", image: media.url },
  400,
);
const ownPost = await call(
  student,
  "posts",
  "POST",
  { body: "Photo #qa " + suffix, image: media.url },
  201,
);
assert.equal((await fetch(base + media.url)).status, 200);
checks++;
const bad = await fetch(base + "/api/upload", {
  method: "POST",
  headers: {
    "Content-Type": "image/svg+xml",
    "oai-authenticated-user-id": student,
    "oai-authenticated-user-email": student + "@example.test",
  },
  body: "<svg/>",
});
assert.equal(bad.status, 400);
checks++;
await call(owner, "schools/" + school.id + "/members", "POST", {
  publicId: people[1].public_id,
  role: "student",
});
await call(teacher, "channels/" + cls.id + "/messages", "GET", undefined, 403);
await call(
  teacher,
  "channels/" + cls.id + "/members",
  "POST",
  { publicId: people[4].public_id },
  403,
);
await call(owner, "schools/" + school.id + "/members", "DELETE", {
  publicId: people[3].public_id,
});
await call(student, "channels/" + cls.id + "/messages", "GET", undefined, 403);
await call(student, "posts/" + ownPost.id, "DELETE", {});
await call(owner, "schools/" + school.id + "/members", "POST", {
  publicId: people[1].public_id,
  role: "teacher",
});
await call(teacher, "posts/" + post.id, "DELETE", {});
assert.equal((await call(null, "posts?q=" + suffix)).length, 0);
checks++;
console.log(
  `PASS: ${checks} API checks; 5 identities; ownership, roles, private chats, persistence reads, likes, comments, files, validation, CSRF, revocation.`,
);
