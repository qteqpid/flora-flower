const Pusher = require("pusher");

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function readConfig() {
  return {
    appId: process.env.PUSHER_APP_ID || "PUSHER_APP_ID",
    key: process.env.PUSHER_APP_KEY || "PUSHER_APP_KEY",
    secret: process.env.PUSHER_APP_SECRET || "PUSHER_APP_SECRET",
    cluster: process.env.PUSHER_CLUSTER || "PUSHER_CLUSTER",
    useTLS: true
  };
}

function parseBody(event) {
  if (!event.body) return {};

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(event.body);
  }

  return Object.fromEntries(new URLSearchParams(event.body));
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "只允许 POST 请求" })
    };
  }

  try {
    const body = parseBody(event);
    const socketId = body.socket_id;
    const channelName = body.channel_name;
    const playerId = String(body.player_id || `guest-${Date.now()}`).slice(0, 80);
    const playerName = String(body.player_name || "玩家").slice(0, 40);
    const playerLevel = Math.max(1, Math.floor(Number(body.player_level) || 1));

    if (!socketId || !channelName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "缺少 socket_id 或 channel_name" })
      };
    }

    const pusher = new Pusher(readConfig());
    const presenceData = {
      user_id: playerId,
      user_info: {
        name: playerName,
        level: playerLevel
      }
    };
    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(authResponse)
    };
  } catch (error) {
    console.error("Pusher auth failed", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Pusher 鉴权失败，请检查密钥和环境变量" })
    };
  }
};
