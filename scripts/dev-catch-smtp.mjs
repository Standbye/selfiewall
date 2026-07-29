import { SMTPServer } from "smtp-server";
import fs from "node:fs";
const out = process.argv[2];
new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onData(stream, session, cb) {
    let data = "";
    stream.on("data", (c) => (data += c));
    stream.on("end", () => {
      fs.writeFileSync(out, `RCPT: ${session.envelope.rcptTo.map((r) => r.address).join(", ")}\n\n${data}`);
      console.log("Mail empfangen an:", session.envelope.rcptTo.map((r) => r.address).join(", "));
      cb();
    });
  },
}).listen(2525, () => console.log("Test-SMTP bereit auf 2525"));
