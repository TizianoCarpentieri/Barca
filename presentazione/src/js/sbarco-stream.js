/**
 * Rivela i token SSE a cadenza visibile.
 * Rete e Cloudflare spesso consegnano l'intera risposta in un unico read:
 * senza questa coda il DOM si aggiorna una sola volta (blocco unico).
 */
export function createStreamReveal({
  intervalMs = 32,
  reducedMotion = false,
  onUpdate,
} = {}) {
  let received = "";
  let visible = "";
  let timer = null;
  let finished = false;
  let settle = null;
  const done = new Promise(resolve => {
    settle = resolve;
  });

  function backlogStep() {
    const backlog = received.length - visible.length;
    if (backlog > 900) return 80;
    if (backlog > 320) return 40;
    if (backlog > 90) return 22;
    return 12;
  }

  function emit(streaming) {
    onUpdate?.(visible, { streaming, done: !streaming && finished });
  }

  function stopTimer() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function complete() {
    visible = received;
    stopTimer();
    emit(false);
    settle?.(visible);
  }

  function tick() {
    if (visible.length < received.length) {
      visible = reducedMotion
        ? received
        : received.slice(0, visible.length + backlogStep());
      emit(visible.length < received.length || !finished);
    }
    if (visible.length >= received.length && finished) complete();
  }

  function start() {
    if (timer != null) return;
    tick();
    if (visible.length < received.length || !finished) {
      timer = setInterval(tick, intervalMs);
    }
  }

  return {
    push(token) {
      if (!token) return;
      received += String(token);
      if (reducedMotion) {
        visible = received;
        emit(!finished);
        if (finished) complete();
        return;
      }
      start();
    },
    flush() {
      finished = true;
      if (!received) {
        settle?.("");
        return done;
      }
      if (reducedMotion || visible.length >= received.length) {
        complete();
        return done;
      }
      start();
      return done;
    },
    cancel() {
      finished = true;
      complete();
    },
    get received() {
      return received;
    },
    get visible() {
      return visible;
    },
  };
}
