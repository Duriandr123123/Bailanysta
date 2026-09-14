import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text().primaryKey(),
  publicId: text("public_id").notNull().unique(),
  name: text().notNull(),
  bio: text().notNull().default(""),
  createdAt: integer("created_at").notNull(),
});
export const schools = sqliteTable("schools", {
  id: text().primaryKey(),
  name: text().notNull(),
  city: text().notNull(),
  description: text().notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at").notNull(),
});
export const members = sqliteTable(
  "members",
  {
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.userId] })],
);
export const channels = sqliteTable("channels", {
  id: text().primaryKey(),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id),
  name: text().notNull(),
  kind: text().notNull(),
  teacherId: text("teacher_id").references(() => users.id),
});
export const channelMembers = sqliteTable(
  "channel_members",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.userId] })],
);
export const messages = sqliteTable(
  "messages",
  {
    id: text().primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_messages_channel_time").on(t.channelId, t.createdAt)],
);
export const posts = sqliteTable(
  "posts",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    schoolId: text("school_id").references(() => schools.id),
    body: text().notNull(),
    searchText: text("search_text").notNull().default(""),
    kind: text().notNull().default("post"),
    image: text(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at"),
  },
  (t) => [
    index("idx_posts_created").on(t.createdAt),
    index("idx_posts_school").on(t.schoolId, t.createdAt),
    index("idx_posts_user").on(t.userId),
  ],
);
export const likes = sqliteTable(
  "likes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);
export const comments = sqliteTable(
  "comments",
  {
    id: text().primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_comments_post").on(t.postId, t.createdAt)],
);
export const notifications = sqliteTable(
  "notifications",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    href: text().notNull(),
    seen: integer().notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_notifications_user").on(t.userId, t.createdAt)],
);
export const uploads = sqliteTable("uploads", {
  id: text().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  mime: text().notNull(),
});

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedId: text("followed_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    index("idx_follows_followed").on(t.followedId),
  ],
);
