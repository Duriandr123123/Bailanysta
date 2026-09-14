import { db } from "./db";
// Вымышленные демонстрационные записи. Не входят в миграции и не заменяют пользовательские данные.
export async function seed() {
  const statements = [
    db()
      .prepare(
        "INSERT OR IGNORE INTO users (id,public_id,name,bio,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(
        "demo-director",
        "BL-DEMO-01",
        "Алия Нурланова",
        "Координатор школьных проектов · демонстрационный профиль",
        1789380000000,
      ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO users (id,public_id,name,bio,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(
        "demo-student",
        "BL-DEMO-02",
        "Данияр Садыков",
        "Ученик 10 класса. Робототехника и фотография · вымышленный профиль",
        1789380000000,
      ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO schools (id,name,city,description,owner_id,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        "school-orbit",
        "Лицей «Орбита»",
        "Алматы",
        "Место, где любопытство превращается в открытия. Делимся школьной жизнью, поддерживаем друг друга и растём вместе. Демонстрационная организация.",
        "demo-director",
        1789380000000,
      ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO members (school_id,user_id,role) VALUES (?,?,?)",
      )
      .bind("school-orbit", "demo-director", "owner"),
    db()
      .prepare(
        "INSERT OR IGNORE INTO members (school_id,user_id,role) VALUES (?,?,?)",
      )
      .bind("school-orbit", "demo-student", "student"),
    db()
      .prepare(
        "INSERT OR IGNORE INTO channels (id,school_id,name,kind) VALUES (?,?,?,?)",
      )
      .bind("channel-orbit", "school-orbit", "Общий чат школы", "school"),
    db()
      .prepare(
        "INSERT OR IGNORE INTO channels (id,school_id,name,kind) VALUES (?,?,?,?)",
      )
      .bind("channel-10a", "school-orbit", "10 «А»", "class"),
    db()
      .prepare(
        "INSERT OR IGNORE INTO posts (id,user_id,school_id,body,kind,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        "post-welcome",
        "demo-director",
        "school-orbit",
        "Новый учебный год — новые связи! ✨\n\nВ пятницу знакомимся с клубами лицея: робототехника, дебаты, школьное медиа и волонтёрство. Приходите в актовый зал после уроков и найдите то, что увлечёт именно вас.\n\nКакой клуб вам интереснее всего? Делитесь в комментариях.\n\n#школьнаяжизнь #клубы #Орбита",
        "post",
        Date.now() - 3600000,
      ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO posts (id,user_id,school_id,body,kind,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        "post-award",
        "demo-director",
        "school-orbit",
        "Наша команда заняла первое место на городском турнире по робототехнике! 🏆\n\nТри недели сборки, десятки неудачных попыток и одна общая победа. Гордимся каждым участником и благодарим наставников.\n\n#достижения #робототехника",
        "achievement",
        Date.now() - 86400000,
      ),
    db()
      .prepare(
        "INSERT OR IGNORE INTO posts (id,user_id,school_id,body,kind,created_at) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        "post-student",
        "demo-student",
        null,
        "Сегодня впервые выступил на дебатах. Оказалось, самое сложное — сделать первый шаг. Спасибо ребятам за поддержку!\n\n#первыйшаг #дебаты",
        "post",
        Date.now() - 90000000,
      ),
  ];
  await db().batch(statements);
  const demo = await db()
    .prepare(
      "SELECT id,body FROM posts WHERE id IN ('post-welcome','post-award','post-student')",
    )
    .all<{ id: string; body: string }>();
  await db().batch(
    demo.results.map((p) =>
      db()
        .prepare("UPDATE posts SET search_text=? WHERE id=?")
        .bind(p.body.toLowerCase(), p.id),
    ),
  );
}
