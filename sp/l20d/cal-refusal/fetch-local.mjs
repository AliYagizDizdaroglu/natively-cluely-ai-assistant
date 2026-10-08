try { await fetch("http://127.0.0.1:9/"); console.log("fetch returned"); } catch (e) { console.log("fetch failed locally: " + (e.cause?.code ?? e.code ?? e.message)); }
