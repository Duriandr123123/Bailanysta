export type Person = {
  id: string;
  public_id: string;
  name: string;
  bio: string;
};
export type School = {
  id: string;
  name: string;
  city: string;
  description: string;
  owner_id: string;
  memberCount: number;
  postCount: number;
  role?: string;
};
export type Post = {
  id: string;
  user_id: string;
  school_id: string | null;
  body: string;
  kind: string;
  image: string | null;
  created_at: number;
  updated_at: number | null;
  name: string;
  public_id: string;
  school_name: string | null;
  likes: number;
  comments: number;
  liked: number;
};
export type Channel = {
  id: string;
  school_id: string;
  name: string;
  kind: string;
  school_name: string;
};
export type Message = {
  id: string;
  body: string;
  name: string;
  user_id: string;
  created_at: number;
};
