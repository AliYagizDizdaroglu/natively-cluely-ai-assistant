import net from "node:net"; const s = net.connect(9, "127.0.0.1"); s.on("error", (e) => console.log("socket failed locally: " + e.code)); s.on("connect", () => console.log("connected"));
