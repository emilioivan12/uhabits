// Port of SQLParser.kt — same state machine, string-based instead of stream-based.
export function parse(sql: string): string[] {
  const statements: string[] = [];
  let buf = "";
  type State = "NONE" | "STRING" | "COMMENT" | "COMMENT_BLOCK";
  let state: State = "NONE";
  let i = 0;

  while (i < sql.length) {
    const c = sql[i];

    if (state === "COMMENT_BLOCK") {
      if (c === "*" && sql[i + 1] === "/") {
        i += 2;
        state = "NONE";
      } else {
        i++;
      }
      continue;
    }

    if (state === "COMMENT") {
      if (c === "\r" || c === "\n") state = "NONE";
      i++;
      continue;
    }

    if (state === "NONE") {
      if (c === "/" && sql[i + 1] === "*") {
        i += 2;
        state = "COMMENT_BLOCK";
        continue;
      }
      if (c === "-" && sql[i + 1] === "-") {
        i += 2;
        state = "COMMENT";
        continue;
      }
      if (c === ";") {
        statements.push(buf.trim());
        buf = "";
        i++;
        continue;
      }
      if (c === "'") {
        state = "STRING";
        buf += c;
        i++;
        continue;
      }
      if (c === " " || c === "\t" || c === "\r" || c === "\n") {
        if (buf.length > 0 && buf[buf.length - 1] !== " ") buf += " ";
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    // state === STRING
    if (c === "'") state = "NONE";
    buf += c;
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0) statements.push(tail);

  return statements;
}
