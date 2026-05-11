'use strict';

const pty    = require('node-pty');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { execSync } = require('child_process');
const logger = require('./logger');

const SRC = 'backend/sessionManager';
const CWD = 'C:\\Users\\alexb\\subagents';

// Resolve the absolute path to claude.exe once at module load.
// node-pty on Windows does not inherit the full user PATH, so spawning
// by name ('claude') fails even when claude.exe is on PATH in a shell.
let CLAUDE_BIN = 'claude';
try {
  const result = execSync('where.exe claude', { encoding: 'utf8', timeout: 5000 });
  const first = result.trim().split('\n')[0].trim();
  if (first && fs.existsSync(first)) {
    CLAUDE_BIN = first;
    logger.info(SRC, 'claude_resolved', { path: CLAUDE_BIN });
  } else {
    logger.warn(SRC, 'claude_where_empty', { raw: result.trim() });
  }
} catch (e) {
  logger.warn(SRC, 'claude_where_failed', { err: e.message, fallback: CLAUDE_BIN });
}

function spawnClaude(args) {
  const opts = {
    name: 'xterm-256color',
    cols: 220,
    rows: 50,
    cwd: CWD,
    env: { ...process.env },
  };

  logger.debug(SRC, 'pty_spawn_attempt', { bin: CLAUDE_BIN, args, cwd: CWD });

  try {
    const proc = pty.spawn(CLAUDE_BIN, args, opts);
    logger.info(SRC, 'pty_spawn_ok', { bin: CLAUDE_BIN, args, pid: proc.pid });
    return proc;
  } catch (e) {
    logger.warn(SRC, 'pty_spawn_failed_with_args', { bin: CLAUDE_BIN, args, err: e.message });
    if (args.length > 0) {
      // Retry without extra args (e.g. unsupported flag like --system-prompt-file)
      logger.info(SRC, 'pty_spawn_retry_plain', { bin: CLAUDE_BIN });
      const proc = pty.spawn(CLAUDE_BIN, [], opts);
      logger.info(SRC, 'pty_spawn_ok', { bin: CLAUDE_BIN, args: [], pid: proc.pid });
      return proc;
    }
    throw e;
  }
}

/**
 * Spawn a claude PTY session and wire it to a WebSocket.
 *
 * Priority: resumeSessionId > agentMdPath > plain claude
 *
 * @param {import('ws').WebSocket} ws
 * @param {string|null} agentMdPath
 * @param {string|null} resumeSessionId
 */
function spawnSession(ws, agentMdPath, resumeSessionId) {
  let args = [];
  let tempFile = null;

  if (resumeSessionId) {
    args = ['--resume', resumeSessionId];
    logger.info(SRC, 'session_resume', { resumeSessionId });
  } else if (agentMdPath && fs.existsSync(agentMdPath)) {
    tempFile = path.join(os.tmpdir(), `agent-${Date.now()}.md`);
    try {
      fs.writeFileSync(tempFile, fs.readFileSync(agentMdPath, 'utf8'));
      args = ['--system-prompt-file', tempFile];
      logger.info(SRC, 'session_agent', { agentMdPath, tempFile });
    } catch (writeErr) {
      logger.warn(SRC, 'temp_file_write_failed', { err: writeErr.message });
      tempFile = null;
      args = [];
    }
  } else {
    logger.info(SRC, 'session_new', { agentMdPath, resumeSessionId });
  }

  let proc;
  try {
    proc = spawnClaude(args);
  } catch (e) {
    logger.error(SRC, 'spawn_fatal', { err: e.message, args });
    const errMsg = JSON.stringify({ type: 'error', data: `Failed to spawn claude: ${e.message}` });
    if (ws.readyState === 1) ws.send(errMsg);
    ws.close();
    if (tempFile) try { fs.unlinkSync(tempFile); } catch {}
    return;
  }

  proc.onData(data => {
    if (ws.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'output', data })); } catch {}
    }
  });

  proc.onExit(({ exitCode }) => {
    logger.info(SRC, 'pty_exit', { pid: proc.pid, exitCode });
    if (ws.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'exit', exitCode })); } catch {}
    }
    if (tempFile) try { fs.unlinkSync(tempFile); } catch {}
  });

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'input' && typeof msg.data === 'string') {
        proc.write(msg.data);
      } else if (msg.type === 'resize') {
        const cols = Number(msg.cols);
        const rows = Number(msg.rows);
        if (cols > 0 && rows > 0) {
          proc.resize(cols, rows);
          logger.debug(SRC, 'pty_resize', { pid: proc.pid, cols, rows });
        }
      }
    } catch { /* ignore malformed messages */ }
  });

  function cleanup() {
    logger.info(SRC, 'session_cleanup', { pid: proc.pid });
    try { proc.kill(); } catch {}
    if (tempFile) try { fs.unlinkSync(tempFile); } catch {}
  }

  ws.on('close', cleanup);
  ws.on('error', (err) => {
    logger.warn(SRC, 'ws_error', { pid: proc.pid, err: err.message });
    cleanup();
  });
}

/**
 * Spawn a structured chat session using claude's stream-json output format.
 * Uses child_process.spawn (not node-pty) — no terminal emulation needed.
 *
 * Protocol (Server → Client):
 *   {type:'turn_start'}
 *   {type:'claude_event', event:{...}}   — one JSON line from claude stdout
 *   {type:'turn_done', exitCode, sessionId}
 *   {type:'chat_error', message}
 *
 * Protocol (Client → Server):
 *   {type:'user_message', text:'...'}    — triggers a new claude turn
 *
 * @param {import('ws').WebSocket} ws
 * @param {string|null} resumeSessionId  - session to resume, or null for new
 */
function spawnChatSession(ws, resumeSessionId) {
  const { spawn } = require('child_process');

  let sessionId    = resumeSessionId || null;
  let currentProc  = null;
  let isProcessing = false;

  logger.info(SRC, 'chat_session_open', { resumeSessionId });

  function send(obj) {
    if (ws.readyState === 1) {
      try { ws.send(JSON.stringify(obj)); } catch {}
    }
  }

  function runTurn(text) {
    if (isProcessing) {
      logger.warn(SRC, 'chat_turn_busy', { text: text.slice(0, 80) });
      return;
    }
    isProcessing = true;

    const args = ['--output-format', 'stream-json', '--verbose', '-p', text];
    if (sessionId) args.push('--resume', sessionId);

    logger.info(SRC, 'chat_turn_start', { sessionId, textLen: text.length });
    send({ type: 'turn_start' });

    let proc;
    try {
      proc = spawn(CLAUDE_BIN, args, {
        cwd: CWD,
        env: { ...process.env },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      currentProc = proc;
      logger.info(SRC, 'chat_spawn_ok', { pid: proc.pid, args: args.slice(0, -1) });
    } catch (e) {
      logger.error(SRC, 'chat_spawn_failed', { err: e.message });
      send({ type: 'chat_error', message: `Failed to spawn claude: ${e.message}` });
      isProcessing = false;
      return;
    }

    let stdoutBuf = '';

    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          if (event.type === 'system' && event.session_id) {
            sessionId = event.session_id;
            logger.info(SRC, 'chat_session_id', { sessionId });
          }
          logger.debug(SRC, 'chat_event', { eventType: event.type });
          send({ type: 'claude_event', event });
        } catch (parseErr) {
          logger.warn(SRC, 'chat_stdout_parse_error', { line: trimmed.slice(0, 120), err: parseErr.message });
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      logger.warn(SRC, 'chat_stderr', { text: text.slice(0, 200) });
    });

    proc.on('close', (exitCode) => {
      // Flush remaining buffer
      if (stdoutBuf.trim()) {
        try {
          const event = JSON.parse(stdoutBuf.trim());
          if (event.type === 'system' && event.session_id) sessionId = event.session_id;
          send({ type: 'claude_event', event });
        } catch {}
      }
      currentProc  = null;
      isProcessing = false;
      logger.info(SRC, 'chat_turn_done', { exitCode, sessionId });
      send({ type: 'turn_done', exitCode, sessionId });
    });

    proc.on('error', (err) => {
      logger.error(SRC, 'chat_proc_error', { err: err.message });
      send({ type: 'chat_error', message: err.message });
      isProcessing = false;
      currentProc  = null;
    });
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'user_message' && typeof msg.text === 'string' && msg.text.trim()) {
        runTurn(msg.text);
      }
    } catch { /* ignore malformed */ }
  });

  ws.on('close', () => {
    logger.info(SRC, 'chat_session_close', { sessionId });
    if (currentProc) { try { currentProc.kill(); } catch {} }
  });

  ws.on('error', (err) => {
    logger.warn(SRC, 'chat_session_ws_error', { err: err.message });
    if (currentProc) { try { currentProc.kill(); } catch {} }
  });
}

module.exports = { spawnSession, spawnChatSession };
